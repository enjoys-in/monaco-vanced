// ── Wireframe entry — mounts plugin-driven IDE chrome ───────

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { WireframeAPIs, VirtualFile } from "./types";
import type { MockFsAPI } from "../mock-fs";
import type { SidebarExtras } from "./layout/sidebar";

// Layout
import { buildShell } from "./layout/shell";
import { wireActivityBar } from "./layout/activity-bar";
import { wireSidebar, wireResizeHandle } from "./layout/sidebar";
import { wireTabs } from "./layout/tabs";
import { wireTitleBar, wireStatusBar } from "./layout/bars";

// Panels
import { wireNotifications } from "./panels/notifications";
import { wireContextMenu, wireCommandPalette, wireBottomPanel } from "./panels/overlays";
import { wireSettingsWebview } from "./panels/settings-webview";

export type { WireframeAPIs, VirtualFile } from "./types";

export type { SidebarExtras as WireframeExtras } from "./layout/sidebar";

export function mountWireframe(
  root: HTMLElement,
  apis: WireframeAPIs,
  eventBus: InstanceType<typeof EventBus>,
  files: VirtualFile[],
  mockFs?: MockFsAPI,
  extras?: SidebarExtras,
): { editorContainer: HTMLElement; destroy: () => void } {
  const dom = buildShell(root);
  const disposers: (() => void)[] = [];
  const on = (ev: string, fn: (p: unknown) => void) => {
    eventBus.on(ev, fn);
    disposers.push(() => eventBus.off(ev, fn));
  };

  wireActivityBar(dom, apis, eventBus, on);
  wireSidebar(dom, apis, eventBus, on, files, mockFs, extras);
  wireTabs(dom, eventBus, on, files);
  wireTitleBar(dom, apis, eventBus, on);
  wireStatusBar(dom, apis, on);
  wireBottomPanel(dom, eventBus, on, files);
  wireNotifications(dom, apis, on);
  wireContextMenu(dom, apis, on);
  wireCommandPalette(dom, apis, on);
  wireSettingsWebview(dom, apis, eventBus, on);
  wireResizeHandle(dom);

  return {
    editorContainer: dom.editorContainer,
    destroy: () => { disposers.forEach((d) => d()); dom.root.innerHTML = ""; },
  };
}
