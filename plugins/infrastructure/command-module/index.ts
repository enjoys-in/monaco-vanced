// ── Command Module — Plugin Entry ──────────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { Command, CommandConfig, CommandModuleAPI, CommandHistoryEntry } from "./types";
import { CommandRegistry } from "./registry";
import { CommandRouter } from "./router";
import { CommandPalette } from "./palette";
import { CommandEvents } from "@core/events";

export type { Command, CommandConfig, CommandModuleAPI, CommandHistoryEntry, ExecutionContext, ActionDefinition } from "./types";
export { CommandRegistry } from "./registry";
export { CommandRouter } from "./router";
export { CommandPalette } from "./palette";
export { WhenClauseEvaluator } from "./when-clause";

export function createCommandPlugin(config: CommandConfig = {}): {
  plugin: MonacoPlugin;
  api: CommandModuleAPI;
} {
  const registry = new CommandRegistry();
  const router = new CommandRouter(registry, config.maxHistory);
  const palette = new CommandPalette(registry);
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;

  const api: CommandModuleAPI = {
    register(cmd: Command): IDisposable {
      registry.register(cmd);
      return {
        dispose() {
          registry.unregister(cmd.id);
        },
      };
    },

    async execute(id: string, ...args: unknown[]): Promise<void> {
      await router.execute(id, args);
      palette.execute(id);
      ctx?.emit(CommandEvents.Execute, { commandId: id, args });
    },

    getAll(): Command[] {
      return registry.getAll();
    },

    search(query: string): Command[] {
      return palette.filter(query);
    },

    getHistory(): CommandHistoryEntry[] {
      return router.getHistory();
    },

    enable(id: string): void {
      registry.enable(id);
    },

    disable(id: string): void {
      registry.disable(id);
    },

    isEnabled(id: string): boolean {
      return registry.isEnabled(id);
    },

    bindToEditor(editor: unknown): IDisposable {
      return palette.bindToEditor(editor);
    },

    onBeforeExecute(handler: (data?: unknown) => void): IDisposable {
      const remove = router.addBeforeHook(handler);
      return { dispose: remove };
    },

    onAfterExecute(handler: (data?: unknown) => void): IDisposable {
      const remove = router.addAfterHook(handler);
      return { dispose: remove };
    },
  };

  const plugin: MonacoPlugin = {
    id: "infrastructure.command",
    name: "Command Module",
    version: "1.0.0",
    description: "Command registration, execution, palette, and routing",

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      disposables.push(
        ctx.on(CommandEvents.Execute, async (data?: unknown) => {
          const d = data as { commandId?: string; args?: unknown[] } | undefined;
          if (d?.commandId) {
            try {
              await router.execute(d.commandId, d.args ?? []);
            } catch (e) {
              console.error("[command-module] execution error:", e);
            }
          }
        }),
      );

      disposables.push(
        ctx.on("command:register", (data?: unknown) => {
          const cmd = data as Command | undefined;
          if (cmd) registry.register(cmd);
        }),
      );
    },

    onDispose() {
      disposables.forEach((d) => d.dispose());
      disposables.length = 0;
      palette.dispose();
      registry.clear();
      ctx = null;
    },
  };

  return { plugin, api };
}
