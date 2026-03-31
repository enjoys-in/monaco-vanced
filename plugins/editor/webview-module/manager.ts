// ── Webview Manager ─────────────────────────────────────────
// Central registry for eager and lazy webviews. Handles
// creation, lookup, lazy instantiation, and auto-command
// registration for WebviewDescriptors.

import type { IDisposable, PluginContext } from "@core/types";
import { WebviewEvents } from "@core/events";
import type {
  WebviewPanel,
  WebviewPanelOptions,
  WebviewDescriptor,
  WebviewModuleAPI,
} from "./types";
import { WebviewPanelImpl } from "./panel";

export class WebviewManager implements WebviewModuleAPI {
  /** Live (eager or materialized lazy) panels */
  private readonly _panels = new Map<string, WebviewPanelImpl>();
  /** Lazy descriptors (not yet created) */
  private readonly _descriptors = new Map<string, WebviewDescriptor>();
  /** Track loader/action state per panel for coordination */
  private readonly _loaderRunning = new Set<string>();
  private readonly _actionRunning = new Set<string>();
  /** Queued action while loader is running */
  private readonly _pendingAction = new Map<string, unknown>();

  private _ctx: PluginContext | null = null;

  setContext(ctx: PluginContext): void {
    this._ctx = ctx;
  }

  // ── Eager creation ─────────────────────────────────────

  createWebview(options: WebviewPanelOptions): WebviewPanel {
    if (!this._ctx) throw new Error("WebviewManager: context not set");

    if (this._panels.has(options.id)) {
      const existing = this._panels.get(options.id)!;
      if (!existing.disposed) {
        existing.show();
        return existing;
      }
    }

    const panel = new WebviewPanelImpl(options, this._ctx);
    this._panels.set(options.id, panel);

    // Run lifecycle
    void this._runLifecycle(panel, options);

    return panel;
  }

  // ── Lazy registration ──────────────────────────────────

  registerWebview(descriptor: WebviewDescriptor): IDisposable {
    if (!this._ctx) throw new Error("WebviewManager: context not set");

    this._descriptors.set(descriptor.id, descriptor);

    const ctx = this._ctx;

    // Auto-register command if provided
    if (descriptor.command) {
      ctx.addAction({
        id: descriptor.command,
        label: descriptor.title,
        run: () => {
          this._materializeLazy(descriptor.id);
        },
      });
    }

    // Auto-register keybinding if provided (requires command)
    if (descriptor.keybinding && descriptor.command) {
      ctx.addKeybinding(
        0, // Keybinding code — host app resolves the string via keybinding-module
        () => this._materializeLazy(descriptor.id),
        descriptor.title,
      );
    }

    // Emit registration event
    ctx.emit(WebviewEvents.Registered, {
      id: descriptor.id,
      command: descriptor.command,
      keybinding: descriptor.keybinding,
    });

    return {
      dispose: () => {
        this._descriptors.delete(descriptor.id);
        const panel = this._panels.get(descriptor.id);
        if (panel && !panel.disposed) panel.dispose();
        this._panels.delete(descriptor.id);
      },
    };
  }

  // ── Lookup ─────────────────────────────────────────────

  getWebview(id: string): WebviewPanel | null {
    const panel = this._panels.get(id);
    if (panel && !panel.disposed) return panel;
    return null;
  }

  getWebviews(): WebviewPanel[] {
    const result: WebviewPanel[] = [];
    for (const panel of this._panels.values()) {
      if (!panel.disposed) result.push(panel);
    }
    return result;
  }

  hasWebview(id: string): boolean {
    return this._panels.has(id) || this._descriptors.has(id);
  }

  // ── Lazy materialize ───────────────────────────────────

  private _materializeLazy(id: string): void {
    if (!this._ctx) return;

    // Already exists?
    const existing = this._panels.get(id);
    if (existing && !existing.disposed) {
      if (existing.visible) existing.focus();
      else existing.show();
      return;
    }

    // Is it registered as lazy?
    const descriptor = this._descriptors.get(id);
    if (!descriptor) return;

    this._ctx.emit(WebviewEvents.LazyCreate, { id });

    // Call the factory
    const options = descriptor.create(this._ctx);
    this.createWebview(options);
  }

  // ── Lifecycle runner ───────────────────────────────────

  private async _runLifecycle(
    panel: WebviewPanelImpl,
    options: WebviewPanelOptions,
  ): Promise<void> {
    if (!this._ctx) return;

    // Phase 1: beforeMount
    if (options.beforeMount) {
      this._ctx.emit(WebviewEvents.BeforeMount, { id: panel.id });
      try {
        const data = await options.beforeMount(this._ctx);
        panel._setInitialData(data);
      } catch (error) {
        this._ctx.emit(WebviewEvents.Error, {
          id: panel.id,
          phase: "beforeMount",
          error,
        });
        return; // Abort — don't mount
      }
    }

    // Phase 2: loader (with coordination tracking)
    if (options.loader) {
      await this._runLoader(panel);
    }

    // Phase 3: show
    panel._setVisible(true);
    this._ctx.emit(WebviewEvents.Create, {
      id: panel.id,
      location: panel.location,
    });

    // Phase 4: afterMount
    if (options.afterMount) {
      this._ctx.emit(WebviewEvents.AfterMount, { id: panel.id });
      options.afterMount(this._ctx, panel);
    }

    // Phase 5: drain any action that was queued during loader
    const queued = this._pendingAction.get(panel.id);
    if (queued !== undefined) {
      this._pendingAction.delete(panel.id);
      void this.handleAction(panel.id, queued);
    }
  }

  // ── Loader runner with coordination ────────────────────

  private async _runLoader(panel: WebviewPanelImpl): Promise<void> {
    if (!this._ctx) return;
    const options = panel.options;
    if (!options.loader) return;

    // Rule 4: Don't start loader while action is running
    if (this._actionRunning.has(panel.id)) return;

    this._loaderRunning.add(panel.id);
    this._ctx.emit(WebviewEvents.LoaderStart, { id: panel.id });

    try {
      const data = await options.loader(this._ctx);
      panel._setLoaderData(data);
      this._ctx.emit(WebviewEvents.LoaderDone, { id: panel.id });
    } catch (error) {
      // Rule 7: Forward loader error to iframe
      this._ctx.emit(WebviewEvents.Error, {
        id: panel.id,
        phase: "loader",
        error,
      });
    } finally {
      this._loaderRunning.delete(panel.id);
    }
  }

  // ── Action handler with coordination ───────────────────

  async handleAction(panelId: string, actionData: unknown): Promise<unknown> {
    if (!this._ctx) throw new Error("WebviewManager: context not set");

    const panel = this._panels.get(panelId);
    if (!panel || panel.disposed) return undefined;

    const options = panel.options;
    if (!options.action) return undefined;

    // Rule 2: Queue action if loader is running
    if (this._loaderRunning.has(panelId)) {
      // Rule 5: Only keep the latest action (overwrite previous)
      this._pendingAction.set(panelId, actionData);
      return undefined;
    }

    // Rule 5: Overwrite any previously queued action
    this._pendingAction.delete(panelId);

    this._actionRunning.add(panelId);
    this._ctx.emit(WebviewEvents.ActionStart, {
      id: panelId,
      data: actionData,
    });

    try {
      const result = await options.action(this._ctx, actionData);
      this._ctx.emit(WebviewEvents.ActionDone, { id: panelId, result });
      this._actionRunning.delete(panelId);

      // Rule 3: Auto-reload after successful action
      if (options.loader) {
        await this._runLoader(panel);
      }

      return result;
    } catch (error) {
      this._actionRunning.delete(panelId);
      // Rule 8: Emit error, do NOT re-run loader on error
      this._ctx.emit(WebviewEvents.ActionError, { id: panelId, error });
      throw error;
    }
  }

  // ── Cleanup ────────────────────────────────────────────

  disposeAll(): void {
    for (const panel of this._panels.values()) {
      if (!panel.disposed) panel.dispose();
    }
    this._panels.clear();
    this._descriptors.clear();
  }
}
