// ── Plugin engine — registers, sorts, initializes, and manages plugin lifecycle ──
// Topological sort by dependencies + priority. 5-phase lifecycle.
// Supports skip/abort/retry error strategies, onReady/onFailed hooks.

import type { MonacoPlugin, Monaco, MonacoEditor, BootConfig, PluginErrorStrategy } from "./types";
import { EventBus } from "./event-bus";
import { PluginContext } from "./plugin-context";
import { ErrorBoundary } from "./error-boundary";
import { LanguageRegistry } from "./language-registry";

interface PluginEntry {
  plugin: MonacoPlugin;
  enabled: boolean;
}

export class PluginEngine {
  private plugins = new Map<string, PluginEntry>();
  private contexts = new Map<string, PluginContext>();
  private bootOrder: string[] = [];
  private eventBus: EventBus;
  private errorBoundary: ErrorBoundary;
  private languageRegistry = new LanguageRegistry();
  private bootConfig: Required<BootConfig>;
  private booted = false;

  constructor(eventBus?: EventBus, bootConfig?: BootConfig) {
    this.eventBus = eventBus ?? new EventBus();
    this.errorBoundary = new ErrorBoundary(this.eventBus);
    this.bootConfig = {
      onPluginError: bootConfig?.onPluginError ?? "skip",
      retryCount: bootConfig?.retryCount ?? 3,
      retryDelay: bootConfig?.retryDelay ?? 1000,
      onAllReady: bootConfig?.onAllReady ?? (() => {}),
      onAnyFailed: bootConfig?.onAnyFailed ?? (() => {}),
    };
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  getLanguageRegistry(): LanguageRegistry {
    return this.languageRegistry;
  }

  // ── Registration ──────────────────────────────────────────

  register(plugin: MonacoPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin "${plugin.id}" is already registered.`);
    }
    this.plugins.set(plugin.id, {
      plugin,
      enabled: plugin.defaultEnabled !== false,
    });
    this.eventBus.emit("plugin:register", { name: plugin.id });
  }

  registerAll(plugins: MonacoPlugin[]): void {
    for (const p of plugins) this.register(p);
  }

  // ── Topological sort ──────────────────────────────────────

  private topoSort(): string[] {
    const visited = new Set<string>();
    const sorted: string[] = [];
    const visiting = new Set<string>();

    const visit = (id: string) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error(`Circular dependency detected involving plugin "${id}"`);
      }
      visiting.add(id);

      const entry = this.plugins.get(id);
      if (entry?.plugin.dependencies) {
        for (const depId of entry.plugin.dependencies) {
          if (!this.plugins.has(depId)) {
            throw new Error(`Plugin "${id}" depends on unknown plugin "${depId}"`);
          }
          visit(depId);
        }
      }

      visiting.delete(id);
      visited.add(id);
      sorted.push(id);
    };

    // Sort by priority (higher first) before topo-sort to respect priority within tiers
    const byPriority = [...this.plugins.entries()]
      .filter(([, e]) => e.enabled)
      .sort(([, a], [, b]) => (b.plugin.priority ?? 0) - (a.plugin.priority ?? 0));

    for (const [id] of byPriority) {
      visit(id);
    }

    return sorted;
  }

  // ── Full boot sequence ────────────────────────────────────

  /**
   * Phase 1-5 lifecycle boot.
   * 1. topoSort
   * 2. onBeforeMount(monaco) — sequential
   * 3. Create editor (provided externally)
   * 4. onMount(ctx) — sequential with error handling
   * 5. Runtime event routing
   */
  async boot(monaco: Monaco, editor: MonacoEditor): Promise<void> {
    if (this.booted) throw new Error("PluginEngine already booted.");
    this.booted = true;

    // Phase 1: Resolve dependency order
    this.bootOrder = this.topoSort();

    // Phase 2: onBeforeMount — register languages, themes, grammars
    for (const id of this.bootOrder) {
      const { plugin } = this.plugins.get(id)!;
      if (plugin.onBeforeMount) {
        const result = await this.errorBoundary.guard(id, "onBeforeMount", () =>
          plugin.onBeforeMount!(monaco),
        );
        if (!result.ok && this.bootConfig.onPluginError === "abort") {
          throw new Error(`Abort: plugin "${id}" failed in onBeforeMount`);
        }
      }
    }

    // Phase 3: Editor already created (passed in). Build contexts.
    // Phase 4: onMount — sequential with retry/skip/abort
    const failures: Array<{ pluginId: string; error: unknown }> = [];
    const succeeded: string[] = [];

    for (const id of this.bootOrder) {
      const { plugin } = this.plugins.get(id)!;
      const ctx = new PluginContext(id, monaco, editor, this.eventBus);
      this.contexts.set(id, ctx);

      this.eventBus.emit("plugin:init", { name: id });

      const ok = await this.initWithStrategy(id, plugin, ctx);

      if (ok) {
        succeeded.push(id);
        this.eventBus.emit("plugin:ready", { name: id });
        if (plugin.onReady) {
          await this.errorBoundary.guard(id, "onReady", () => plugin.onReady!(ctx));
        }
      } else {
        failures.push({ pluginId: id, error: `Init failed for ${id}` });
        if (this.bootConfig.onPluginError === "abort") {
          this.bootConfig.onAnyFailed(failures);
          this.eventBus.emit("plugin:boot-failed", {
            failedCount: failures.length,
            names: failures.map((f) => f.pluginId),
          });
          throw new Error(`Abort: plugin "${id}" failed to init`);
        }
      }
    }

    // Phase 5: Wire runtime event routing
    this.wireRuntimeEvents(monaco, editor);

    // Boot complete — fire global hooks
    if (failures.length > 0) {
      this.bootConfig.onAnyFailed(failures);
      this.eventBus.emit("plugin:boot-failed", {
        failedCount: failures.length,
        names: failures.map((f) => f.pluginId),
      });
    }

    this.eventBus.emit("plugin:all-ready", {
      count: succeeded.length,
      names: succeeded,
    });
    this.bootConfig.onAllReady(succeeded);
  }

  // ── Init with retry strategy ──────────────────────────────

  private async initWithStrategy(
    id: string,
    plugin: MonacoPlugin,
    ctx: PluginContext,
  ): Promise<boolean> {
    const strategy = this.bootConfig.onPluginError;
    const maxAttempts = strategy === "retry" ? this.bootConfig.retryCount : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await this.errorBoundary.guard(id, "onMount", () =>
        plugin.onMount?.(ctx),
      );

      if (result.ok) return true;

      // Failed
      if (plugin.onFailed) {
        await this.errorBoundary.guard(id, "onFailed", () =>
          plugin.onFailed!(result.error, ctx),
        );
      }

      if (strategy === "retry" && attempt < maxAttempts) {
        console.warn(`[PluginEngine] Retrying "${id}" (${attempt}/${maxAttempts})...`);
        await this.delay(this.bootConfig.retryDelay);
      }
    }

    // All attempts exhausted
    console.error(`[PluginEngine] Plugin "${id}" failed to init after ${maxAttempts} attempt(s).`);
    this.eventBus.emit("plugin:error", { name: id, error: `Init failed` });
    ctx.dispose();
    this.contexts.delete(id);
    return false;
  }

  // ── Runtime event routing ─────────────────────────────────

  private wireRuntimeEvents(monaco: Monaco, editor: MonacoEditor): void {
    // Language change
    editor.onDidChangeModelLanguage?.((e) => {
      const language = e.newLanguage;
      this.eventBus.emit("editor:language-change", { language });
      for (const id of this.bootOrder) {
        const { plugin } = this.plugins.get(id)!;
        const ctx = this.contexts.get(id);
        if (plugin.onLanguageChange && ctx) {
          this.errorBoundary.guardSync(id, "onLanguageChange", () =>
            plugin.onLanguageChange!(language, ctx),
          );
        }
      }
    });

    // Content change (debounced 300ms)
    let contentTimer: ReturnType<typeof setTimeout> | null = null;
    editor.onDidChangeModelContent?.(() => {
      if (contentTimer) clearTimeout(contentTimer);
      contentTimer = setTimeout(() => {
        const content = editor.getModel()?.getValue() ?? "";
        for (const id of this.bootOrder) {
          const { plugin } = this.plugins.get(id)!;
          const ctx = this.contexts.get(id);
          if (plugin.onContentChange && ctx) {
            this.errorBoundary.guardSync(id, "onContentChange", () =>
              plugin.onContentChange!(content, ctx),
            );
          }
        }
      }, 300);
    });
  }

  // ── Hot-reload: add/remove plugins at runtime ─────────────

  async addPlugin(plugin: MonacoPlugin, monaco: Monaco, editor: MonacoEditor): Promise<void> {
    this.register(plugin);
    const ctx = new PluginContext(plugin.id, monaco, editor, this.eventBus);
    this.contexts.set(plugin.id, ctx);

    if (plugin.onBeforeMount) {
      await plugin.onBeforeMount(monaco);
    }

    const ok = await this.initWithStrategy(plugin.id, plugin, ctx);
    if (ok) {
      this.bootOrder.push(plugin.id);
      this.eventBus.emit("plugin:ready", { name: plugin.id });
    }
  }

  async removePlugin(id: string): Promise<void> {
    const entry = this.plugins.get(id);
    if (!entry) return;

    try {
      await entry.plugin.onDispose?.();
    } catch (err) {
      console.error(`[PluginEngine] Error disposing plugin "${id}":`, err);
    }

    this.contexts.get(id)?.dispose();
    this.contexts.delete(id);
    this.plugins.delete(id);
    this.bootOrder = this.bootOrder.filter((pid) => pid !== id);
    this.eventBus.emit("plugin:destroy", { name: id });
  }

  // ── Full shutdown ─────────────────────────────────────────

  async destroyAll(): Promise<void> {
    // Destroy in reverse boot order
    for (const id of [...this.bootOrder].reverse()) {
      await this.removePlugin(id);
    }
    this.plugins.clear();
    this.bootOrder = [];
    this.booted = false;
    this.eventBus.clear();
  }

  // ── Queries ───────────────────────────────────────────────

  getPlugin(id: string): MonacoPlugin | undefined {
    return this.plugins.get(id)?.plugin;
  }

  getContext(id: string): PluginContext | undefined {
    return this.contexts.get(id);
  }

  getRegisteredIds(): string[] {
    return [...this.plugins.keys()];
  }

  getBootOrder(): string[] {
    return [...this.bootOrder];
  }

  // ── Utils ─────────────────────────────────────────────────

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
