// ── Statusbar Module ───────────────────────────────────────
// Bottom bar: cursor, language, encoding, errors, git branch.
// Each slot is registered by a module via the API.

import type { MonacoPlugin, PluginContext } from "@core/types";
import { StatusbarEvents, CursorEvents, EditorEvents, GitEvents, DiagnosticEvents, CommandEvents } from "@core/events";
import type {
  StatusbarAlignment,
  StatusbarItem,
  StatusbarModuleAPI,
  StatusbarPluginOptions,
} from "./types";
import { SlotRegistry } from "./slot-registry";
import {
  createCursorItem,
  createLanguageItem,
  createBranchItem,
  createErrorItem,
} from "./item";

export function createStatusbarPlugin(
  options: StatusbarPluginOptions = {},
): { plugin: MonacoPlugin; api: StatusbarModuleAPI } {
  const registry = new SlotRegistry();
  let ctx: PluginContext | null = null;

  // Register default items if provided
  if (options.defaultItems) {
    for (const item of options.defaultItems) {
      registry.register(item);
    }
  }

  const api: StatusbarModuleAPI = {
    getItems(alignment?: StatusbarAlignment): StatusbarItem[] {
      return registry.getAll(alignment);
    },

    register(item: StatusbarItem): void {
      registry.register(item);
      ctx?.emit(StatusbarEvents.ItemRegister, item);
    },

    update(id: string, changes: Partial<Omit<StatusbarItem, "id">>): void {
      registry.update(id, changes);
      const updated = registry.get(id);
      if (updated) ctx?.emit(StatusbarEvents.ItemUpdate, updated);
    },

    remove(id: string): void {
      registry.remove(id);
      ctx?.emit(StatusbarEvents.ItemRemove, { id });
    },

    setVisible(id: string, visible: boolean): void {
      registry.setVisible(id, visible);
      ctx?.emit(StatusbarEvents.ItemUpdate, { id, changes: { visible } });
    },
  };

  const plugin: MonacoPlugin = {
    id: "statusbar-module",
    name: "Statusbar Module",
    version: "1.0.0",
    description: "Bottom status bar with cursor, language, encoding, errors, git branch",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;

      // Cursor position → update cursor item
      ctx.addDisposable(
        ctx.on(CursorEvents.Move, (data) => {
          const { line, column } = data as { line: number; column: number };
          const item = createCursorItem(line, column);
          if (registry.has(item.id)) {
            registry.update(item.id, { label: item.label });
          } else {
            registry.register(item);
          }
          ctx?.emit(StatusbarEvents.ItemUpdate, { id: item.id, changes: { label: item.label } });
        }),
      );

      // Language change
      ctx.addDisposable(
        ctx.on(EditorEvents.LanguageChange, (data) => {
          const { language } = data as { language: string };
          const item = createLanguageItem(language);
          if (registry.has(item.id)) {
            registry.update(item.id, { label: item.label });
          } else {
            registry.register(item);
          }
        }),
      );

      // Git branch
      ctx.addDisposable(
        ctx.on(GitEvents.BranchChange, (data) => {
          const { branch } = data as { branch: string };
          const item = createBranchItem(branch);
          if (registry.has(item.id)) {
            registry.update(item.id, { label: item.label });
          } else {
            registry.register(item);
          }
        }),
      );

      // Diagnostics count
      ctx.addDisposable(
        ctx.on(DiagnosticEvents.CountChange, (data) => {
          const { errors, warnings } = data as { errors: number; warnings: number };
          const item = createErrorItem(errors, warnings);
          if (registry.has(item.id)) {
            registry.update(item.id, { label: item.label });
          } else {
            registry.register(item);
          }
        }),
      );

      // Item click → execute command
      ctx.addDisposable(
        ctx.on(StatusbarEvents.ItemClick, (data) => {
          const { id } = data as { id: string };
          const item = registry.get(id);
          if (item?.command) {
            ctx?.emit(CommandEvents.Execute, { commandId: item.command });
          }
        }),
      );
    },

    onDispose(): void {
      registry.dispose();
      ctx = null;
    },
  };

  return { plugin, api };
}

// ── Re-exports ─────────────────────────────────────────────

export type {
  StatusbarAlignment,
  StatusbarItem,
  StatusbarModuleAPI,
  StatusbarPluginOptions,
  StatusbarState,
} from "./types";

export { SlotRegistry } from "./slot-registry";
export {
  formatItemLabel,
  createCursorItem,
  createLanguageItem,
  createEncodingItem,
  createIndentItem,
  createBranchItem,
  createErrorItem,
} from "./item";
