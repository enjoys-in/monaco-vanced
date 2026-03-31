// ── Context Menu Module ────────────────────────────────────
// Editor/explorer/tab context menus with when-clause gating.

import type { MonacoPlugin, PluginContext } from "@core/types";
import { ContextMenuEvents, CommandEvents } from "@core/events";
import type {
  ContextMenuModuleAPI,
  ContextMenuPluginOptions,
  MenuContext,
  MenuGroup,
  MenuItem,
} from "./types";
import { ContextMenuRegistry } from "./registry";
import { ContextMenuRenderer } from "./renderer";
import { filterByConditions } from "./when-evaluator";

export function createContextMenuPlugin(
  options: ContextMenuPluginOptions = {},
): { plugin: MonacoPlugin; api: ContextMenuModuleAPI } {
  const registry = new ContextMenuRegistry();
  const renderer = new ContextMenuRenderer();
  let ctx: PluginContext | null = null;

  // Register default groups
  if (options.defaultGroups) {
    for (const group of options.defaultGroups) {
      registry.registerGroup("editor", group);
    }
  }

  const api: ContextMenuModuleAPI = {
    registerItem(context: MenuContext, item: MenuItem): void {
      registry.registerItem(context, item);
      ctx?.emit(ContextMenuEvents.Register, { context, itemId: item.id });
    },

    unregisterItem(context: MenuContext, itemId: string): void {
      registry.unregisterItem(context, itemId);
      ctx?.emit(ContextMenuEvents.Unregister, { context, itemId });
    },

    registerGroup(context: MenuContext, group: MenuGroup): void {
      registry.registerGroup(context, group);
    },

    getItems(context: MenuContext, evalContext?: Record<string, unknown>): MenuItem[] {
      const items = registry.getResolved(context);
      if (evalContext) {
        return filterByConditions(items, evalContext);
      }
      return items;
    },

    show(context: MenuContext, x: number, y: number, evalContext?: Record<string, unknown>): void {
      const items = api.getItems(context, evalContext);
      const state = renderer.show(context, x, y, items);
      ctx?.emit(ContextMenuEvents.Show, state);
    },

    dismiss(): void {
      const state = renderer.dismiss();
      ctx?.emit(ContextMenuEvents.Dismiss, state);
    },
  };

  const plugin: MonacoPlugin = {
    id: "context-menu-module",
    name: "Context Menu Module",
    version: "1.0.0",
    description: "Context menus with when-clause conditions",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;

      // Listen for menu item selection
      ctx.addDisposable(
        ctx.on(ContextMenuEvents.Select, (data) => {
          const { itemId, context } = data as { itemId: string; context: MenuContext };
          const items = registry.getResolved(context);
          const item = items.find((i) => i.id === itemId);
          if (item?.command) {
            ctx?.emit(CommandEvents.Execute, { commandId: item.command });
          }
          renderer.dismiss();
        }),
      );

      // Dismiss on escape or outside click events
      ctx.addDisposable(
        ctx.on(ContextMenuEvents.Dismiss, () => {
          renderer.dismiss();
        }),
      );
    },

    onDispose(): void {
      registry.dispose();
      renderer.dispose();
      ctx = null;
    },
  };

  return { plugin, api };
}

// ── Re-exports ─────────────────────────────────────────────

export type {
  ContextMenuModuleAPI,
  ContextMenuPluginOptions,
  ContextMenuState,
  ContextCondition,
  MenuContext,
  MenuGroup,
  MenuItem,
  MenuItemType,
} from "./types";

export { ContextMenuRegistry } from "./registry";
export { ContextMenuRenderer } from "./renderer";
export { evaluateWhenClause, evaluateCondition, filterByConditions } from "./when-evaluator";
