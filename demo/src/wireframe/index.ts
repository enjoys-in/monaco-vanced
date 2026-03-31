// ── Wireframe entry — mounts plugin-driven IDE chrome ───────

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
// All wireframe modules import types/events from @enjoys/monaco-vanced
import type { WireframeAPIs } from "./types";
import { buildShell } from "./shell";
import { wireActivityBar } from "./activity-bar";
import { wireSidebar, wireResizeHandle } from "./sidebar";
import { wireTabs } from "./tabs";
import { wireTitleBar, wireStatusBar } from "./bars";
import { wireNotifications } from "./notifications";
import { wireContextMenu, wireCommandPalette, wireBottomPanel } from "./overlays";

export type { WireframeAPIs } from "./types";

export function mountWireframe(
  root: HTMLElement,
  apis: WireframeAPIs,
  eventBus: EventBus,
): { editorContainer: HTMLElement; destroy: () => void } {
  const dom = buildShell(root);
  const disposers: (() => void)[] = [];
  const on = (ev: string, fn: (p: unknown) => void) => {
    eventBus.on(ev, fn);
    disposers.push(() => eventBus.off(ev, fn));
  };

  wireActivityBar(dom, apis, eventBus, on);
  wireSidebar(dom, apis, on);
  wireTabs(dom, eventBus, on);
  wireTitleBar(dom, apis, on);
  wireStatusBar(dom, apis, on);
  wireBottomPanel(dom, apis, on);
  wireNotifications(dom, apis, on);
  wireContextMenu(dom, apis, on);
  wireCommandPalette(dom, apis, on);
  wireResizeHandle(dom);

  return {
    editorContainer: dom.editorContainer,
    destroy: () => { disposers.forEach((d) => d()); dom.root.innerHTML = ""; },
  };
}
