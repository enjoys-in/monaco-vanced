// ── Keybinding Module — Plugin Entry ──────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type {
  Keybinding,
  KeybindingConfig,
  KeybindingModuleAPI,
  KeybindingSource,
  ResolvedKeybinding,
  KeybindingConflict,
} from "./types";
import { normalizeKey } from "./parser";
import { KeybindingResolver } from "./resolver";
import { ConflictDetector } from "./conflict-detector";
import { CommandEvents } from "@core/events";

export type {
  Keybinding,
  KeybindingConfig,
  KeybindingModuleAPI,
  KeybindingSource,
  ResolvedKeybinding,
  KeybindingConflict,
  KeyCombo,
} from "./types";
export { parseKeyCombo, normalizeKey, matchEvent, keyComboToString } from "./parser";
export { KeybindingResolver } from "./resolver";
export { ConflictDetector } from "./conflict-detector";

export function createKeybindingPlugin(config: KeybindingConfig = {}): {
  plugin: MonacoPlugin;
  api: KeybindingModuleAPI;
} {
  const bindings: ResolvedKeybinding[] = [];
  const resolver = new KeybindingResolver();
  const conflictDetector = new ConflictDetector();
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;
  let keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  function syncResolver(): void {
    resolver.setBindings([...bindings]);
  }

  const api: KeybindingModuleAPI = {
    register(binding: Keybinding, source: KeybindingSource = "extension"): IDisposable {
      const resolved: ResolvedKeybinding = { ...binding, source };
      bindings.push(resolved);
      syncResolver();
      return {
        dispose() {
          const idx = bindings.indexOf(resolved);
          if (idx >= 0) {
            bindings.splice(idx, 1);
            syncResolver();
          }
        },
      };
    },

    unregister(key: string, command?: string): void {
      const normalized = normalizeKey(key);
      for (let i = bindings.length - 1; i >= 0; i--) {
        if (normalizeKey(bindings[i].key) === normalized) {
          if (!command || bindings[i].command === command) {
            bindings.splice(i, 1);
          }
        }
      }
      syncResolver();
    },

    getAll(): ResolvedKeybinding[] {
      return [...bindings];
    },

    getForCommand(cmdId: string): ResolvedKeybinding[] {
      return bindings.filter((b) => b.command === cmdId);
    },

    getConflicts(): KeybindingConflict[] {
      return conflictDetector.detect(bindings);
    },

    resolve(event: KeyboardEvent): ResolvedKeybinding | null {
      return resolver.resolve(event);
    },

    importFromVSCode(json: string): number {
      try {
        const entries = JSON.parse(json) as Array<{
          key: string;
          command: string;
          when?: string;
          args?: unknown;
        }>;
        let count = 0;
        for (const entry of entries) {
          if (entry.key && entry.command) {
            bindings.push({
              key: entry.key,
              command: entry.command,
              when: entry.when,
              args: entry.args,
              source: "user",
            });
            count++;
          }
        }
        syncResolver();
        return count;
      } catch {
        console.warn("[keybinding-module] Failed to import VS Code keybindings");
        return 0;
      }
    },
  };

  const plugin: MonacoPlugin = {
    id: "infrastructure.keybinding",
    name: "Keybinding Module",
    version: "1.0.0",
    description: "Keyboard shortcut registration, resolution, and conflict detection",

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      // Register initial custom bindings
      if (config.customBindings) {
        for (const binding of config.customBindings) {
          api.register(binding, "user");
        }
      }

      // Listen for keyboard events
      keydownHandler = (event: KeyboardEvent) => {
        const resolved = resolver.resolve(event);
        if (resolved) {
          event.preventDefault();
          event.stopPropagation();
          ctx?.emit(CommandEvents.Execute, {
            commandId: resolved.command,
            args: resolved.args ? [resolved.args] : [],
          });
        }
      };
      window.addEventListener("keydown", keydownHandler, true);

      disposables.push(
        ctx.on("keybinding:register", (data?: unknown) => {
          const binding = data as Keybinding | undefined;
          if (binding) api.register(binding);
        }),
      );
    },

    onDispose() {
      if (keydownHandler) {
        window.removeEventListener("keydown", keydownHandler, true);
        keydownHandler = null;
      }
      disposables.forEach((d) => d.dispose());
      disposables.length = 0;
      bindings.length = 0;
      ctx = null;
    },
  };

  return { plugin, api };
}
