// ── Layout Module ──────────────────────────────────────────
// Manages split panes, panel visibility, view registration,
// editor groups, and layout persistence.

import type { MonacoPlugin, PluginContext } from "@core/types";
import {
  LayoutEvents,
  SidebarEvents,
  PanelEvents,
} from "@core/events";
import type {
  LayoutModuleAPI,
  LayoutPluginOptions,
  LayoutState,
  PanelView,
  PanelViewLocation,
  SplitDirection,
} from "./types";
import { SplitManager } from "./split-manager";
import { PanelManager } from "./panel-manager";
import { LayoutPersistence } from "./persistence";

export function createLayoutPlugin(
  options: LayoutPluginOptions = {},
): { plugin: MonacoPlugin; api: LayoutModuleAPI } {
  const {
    defaultSidebarWidth = 240,
    defaultRightPanelWidth = 300,
    defaultBottomPanelHeight = 200,
    persistState = true,
    storageKey,
  } = options;

  const splitManager = new SplitManager();
  const panelManager = new PanelManager({
    sidebarWidth: defaultSidebarWidth,
    rightPanelWidth: defaultRightPanelWidth,
    bottomPanelHeight: defaultBottomPanelHeight,
  });
  const persistence = new LayoutPersistence(storageKey);

  let ctx: PluginContext | null = null;

  function getState(): LayoutState {
    return {
      splits: splitManager.getSplits(),
      editorGroups: splitManager.getGroups(),
      activeGroupId: splitManager.getActiveGroupId(),
      sidebarVisible: panelManager.isVisible("sidebar"),
      sidebarWidth: panelManager.getSize("sidebarWidth"),
      rightPanelVisible: panelManager.isVisible("right"),
      rightPanelWidth: panelManager.getSize("rightPanelWidth"),
      bottomPanelVisible: panelManager.isVisible("bottom"),
      bottomPanelHeight: panelManager.getSize("bottomPanelHeight"),
    };
  }

  function emitStateChange(): void {
    const state = getState();
    ctx?.emit(LayoutEvents.StateChange, state);
    if (persistState) {
      persistence.save(state);
    }
  }

  const api: LayoutModuleAPI = {
    getState,

    split(direction: SplitDirection, ratio?: number): string {
      const node = splitManager.split(direction, ratio);
      ctx?.emit(LayoutEvents.Split, { splitId: node.id, direction, ratio: node.ratio });
      emitStateChange();
      return node.id;
    },

    unsplit(splitId: string): void {
      splitManager.unsplit(splitId);
      emitStateChange();
    },

    setSplitRatio(splitId: string, ratio: number): void {
      splitManager.setSplitRatio(splitId, ratio);
      ctx?.emit(LayoutEvents.Resize, { splitId, ratio });
      emitStateChange();
    },

    registerSidebarView(view: PanelView): void {
      const v = { ...view, location: "sidebar" as const };
      panelManager.registerView(v);
      ctx?.emit(SidebarEvents.ViewRegister, { viewId: v.id, label: v.label, icon: v.icon });
    },

    registerBottomView(view: PanelView): void {
      const v = { ...view, location: "bottom" as const };
      panelManager.registerView(v);
    },

    registerRightView(view: PanelView): void {
      const v = { ...view, location: "right" as const };
      panelManager.registerView(v);
    },

    getRegisteredViews(location: PanelViewLocation): PanelView[] {
      return panelManager.getViews(location);
    },

    toggleSidebar(): void {
      const visible = panelManager.toggle("sidebar");
      ctx?.emit(SidebarEvents.Toggle, { visible });
      emitStateChange();
    },

    toggleRightPanel(): void {
      const visible = panelManager.toggle("right");
      ctx?.emit(PanelEvents.RightToggle, { visible });
      emitStateChange();
    },

    toggleBottomPanel(): void {
      const visible = panelManager.toggle("bottom");
      ctx?.emit(PanelEvents.BottomToggle, { visible });
      emitStateChange();
    },

    resizeSidebar(width: number): void {
      panelManager.resize("sidebarWidth", width);
      ctx?.emit(SidebarEvents.Resize, { width });
      emitStateChange();
    },

    resizeRightPanel(width: number): void {
      panelManager.resize("rightPanelWidth", width);
      ctx?.emit(PanelEvents.RightResize, { width });
      emitStateChange();
    },

    resizeBottomPanel(height: number): void {
      panelManager.resize("bottomPanelHeight", height);
      ctx?.emit(PanelEvents.BottomResize, { height });
      emitStateChange();
    },

    focusGroup(groupId: string): void {
      splitManager.setActiveGroup(groupId);
      ctx?.emit(LayoutEvents.Focus, { groupId });
      emitStateChange();
    },

    addEditorGroup(): string {
      const group = splitManager.addGroup();
      emitStateChange();
      return group.id;
    },

    removeEditorGroup(groupId: string): void {
      splitManager.removeGroup(groupId);
      emitStateChange();
    },

    mountWebview(
      id: string,
      location: PanelViewLocation,
      container: HTMLElement,
      title: string,
      icon?: string,
    ): void {
      const view: PanelView = {
        id: `webview:${id}`,
        label: title,
        icon,
        location,
        isWebview: true,
        webviewContainer: container,
      };
      panelManager.registerView(view);
      ctx?.emit(LayoutEvents.WebviewMounted, { id, location });
    },

    unmountWebview(id: string): void {
      panelManager.unregisterView(`webview:${id}`);
      ctx?.emit(LayoutEvents.WebviewUnmounted, { id });
    },

    getWebviewViews(location: PanelViewLocation): PanelView[] {
      return panelManager
        .getViews(location)
        .filter((v) => v.isWebview === true);
    },
  };

  const plugin: MonacoPlugin = {
    id: "layout-module",
    name: "Layout Module",
    version: "1.0.0",
    description: "Split panes, panel management, editor groups, layout persistence",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;

      // Restore persisted state
      if (persistState) {
        const saved = persistence.restore();
        if (saved) {
          panelManager.setVisible("sidebar", saved.sidebarVisible);
          panelManager.setVisible("right", saved.rightPanelVisible);
          panelManager.setVisible("bottom", saved.bottomPanelVisible);
          panelManager.resize("sidebarWidth", saved.sidebarWidth);
          panelManager.resize("rightPanelWidth", saved.rightPanelWidth);
          panelManager.resize("bottomPanelHeight", saved.bottomPanelHeight);
          ctx.emit(LayoutEvents.StateRestore, saved);
        }
      }

      // Listen for toggle events from other plugins (e.g., header)
      ctx.addDisposable(
        ctx.on(SidebarEvents.Toggle, () => {
          panelManager.toggle("sidebar");
          emitStateChange();
        }),
      );

      ctx.addDisposable(
        ctx.on(PanelEvents.BottomToggle, () => {
          panelManager.toggle("bottom");
          emitStateChange();
        }),
      );

      ctx.addDisposable(
        ctx.on(PanelEvents.RightToggle, () => {
          panelManager.toggle("right");
          emitStateChange();
        }),
      );

      // Listen for view activation
      ctx.addDisposable(
        ctx.on(SidebarEvents.ViewActivate, (data) => {
          const { viewId } = data as { viewId: string };
          panelManager.setActiveView("sidebar", viewId);
        }),
      );

      ctx.addDisposable(
        ctx.on(PanelEvents.BottomViewActivate, (data) => {
          const { viewId } = data as { viewId: string };
          panelManager.setActiveView("bottom", viewId);
        }),
      );

      ctx.addDisposable(
        ctx.on(PanelEvents.RightViewActivate, (data) => {
          const { viewId } = data as { viewId: string };
          panelManager.setActiveView("right", viewId);
        }),
      );

      // Listen for webview mount/unmount events from webview-module
      ctx.addDisposable(
        ctx.on("layout:webview-mount", (data) => {
          const { id, location, container, title, icon } = data as {
            id: string;
            location: string;
            container?: HTMLElement;
            title: string;
            icon?: string;
          };
          // Map webview locations to panel view locations
          const loc = location === "editor" ? "right" : (location as PanelViewLocation);
          if (container) {
            api.mountWebview(id, loc, container, title, icon);
          }
        }),
      );

      ctx.addDisposable(
        ctx.on("layout:webview-unmount", (data) => {
          const { id } = data as { id: string };
          api.unmountWebview(id);
        }),
      );
    },

    onDispose(): void {
      if (persistState) {
        persistence.save(getState());
      }
      splitManager.dispose();
      panelManager.dispose();
      ctx = null;
    },
  };

  return { plugin, api };
}

// ── Re-exports ─────────────────────────────────────────────

export type {
  LayoutModuleAPI,
  LayoutPluginOptions,
  LayoutState,
  PanelView,
  PanelViewLocation,
  SplitDirection,
  SplitNode,
  EditorGroup,
} from "./types";

export { SplitManager } from "./split-manager";
export { PanelManager } from "./panel-manager";
export { LayoutPersistence } from "./persistence";
