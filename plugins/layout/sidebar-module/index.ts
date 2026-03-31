// ── Sidebar Module ─────────────────────────────────────────
// Left (or right) panel container: view registration,
// collapse/expand, width resize.

import type { MonacoPlugin, PluginContext } from "@core/types";
import { SidebarEvents } from "@core/events";
import type {
  SidebarModuleAPI,
  SidebarPluginOptions,
  SidebarState,
  SidebarViewConfig,
} from "./types";
import { SidebarPanelRegistry } from "./panel-registry";

export function createSidebarPlugin(
  options: SidebarPluginOptions = {},
): { plugin: MonacoPlugin; api: SidebarModuleAPI } {
  const {
    defaultWidth = 240,
    minWidth = 160,
    maxWidth = 600,
    position = "left",
    persistState = true,
  } = options;

  const registry = new SidebarPanelRegistry();
  let visible = true;
  let width = defaultWidth;
  let ctx: PluginContext | null = null;

  function clampWidth(w: number): number {
    return Math.max(minWidth, Math.min(maxWidth, w));
  }

  const api: SidebarModuleAPI = {
    getState(): SidebarState {
      return {
        visible,
        width,
        position,
        activeViewId: registry.getActive(),
        views: registry.getAll(),
      };
    },

    registerView(view: SidebarViewConfig): void {
      registry.register(view);
      ctx?.emit(SidebarEvents.ViewRegister, {
        viewId: view.id,
        label: view.label,
        icon: view.icon,
      });
    },

    unregisterView(viewId: string): void {
      registry.unregister(viewId);
    },

    activateView(viewId: string): void {
      registry.activate(viewId);
      ctx?.emit(SidebarEvents.ViewActivate, { viewId });
    },

    getActiveView(): string | null {
      return registry.getActive();
    },

    getViews(): SidebarViewConfig[] {
      return registry.getAll();
    },

    toggle(): void {
      visible = !visible;
      ctx?.emit(SidebarEvents.Toggle, { visible });
    },

    setWidth(w: number): void {
      width = clampWidth(w);
      ctx?.emit(SidebarEvents.Resize, { width });
    },
  };

  const plugin: MonacoPlugin = {
    id: "sidebar-module",
    name: "Sidebar Module",
    version: "1.0.0",
    description: "Sidebar panel container with view registration",
    dependencies: ["layout-module"],

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;

      // Restore persisted state
      if (persistState) {
        try {
          const saved = localStorage.getItem("monaco-vanced:sidebar-state");
          if (saved) {
            const parsed = JSON.parse(saved) as { visible?: boolean; width?: number };
            if (typeof parsed.visible === "boolean") visible = parsed.visible;
            if (typeof parsed.width === "number") width = clampWidth(parsed.width);
          }
        } catch {
          // ignore
        }
      }

      // Listen for external toggle
      ctx.addDisposable(
        ctx.on(SidebarEvents.Toggle, () => {
          visible = !visible;
        }),
      );

      // Listen for view refresh
      ctx.addDisposable(
        ctx.on(SidebarEvents.ViewRefresh, (data) => {
          const { viewId } = data as { viewId: string };
          // Re-emit for UI layer to handle
          ctx?.emit(SidebarEvents.ViewRefresh, { viewId });
        }),
      );
    },

    onDispose(): void {
      if (persistState) {
        try {
          localStorage.setItem(
            "monaco-vanced:sidebar-state",
            JSON.stringify({ visible, width }),
          );
        } catch {
          // ignore
        }
      }
      registry.dispose();
      ctx = null;
    },
  };

  return { plugin, api };
}

// ── Re-exports ─────────────────────────────────────────────

export type {
  SidebarModuleAPI,
  SidebarPluginOptions,
  SidebarState,
  SidebarViewConfig,
  SidebarPosition,
} from "./types";

export { SidebarPanelRegistry } from "./panel-registry";
