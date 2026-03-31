// ── Sidebar wiring + resize handle ──────────────────────────

import type { SidebarViewConfig } from "@enjoys/monaco-vanced/layout/sidebar-module";
import { SidebarEvents } from "@enjoys/monaco-vanced/core/events";
import type { DOMRefs, WireframeAPIs, OnHandler } from "./types";
import { el } from "./utils";

export function wireSidebar(dom: DOMRefs, apis: WireframeAPIs, on: OnHandler) {
  on(SidebarEvents.ViewRegister, (p) => {
    const view = p as SidebarViewConfig;
    if (view.render) {
      const container = el("div", { "data-view-id": view.id, style: "display:none;" });
      view.render(container);
      dom.sidebarContent.appendChild(container);
    }
  });

  on(SidebarEvents.ViewActivate, (p) => {
    const { viewId } = p as { viewId: string };
    dom.sidebarHeader.textContent = apis.sidebar?.getViews().find((v) => v.id === viewId)?.label ?? viewId;
    Array.from(dom.sidebarContent.children).forEach((child) => {
      (child as HTMLElement).style.display = (child as HTMLElement).dataset.viewId === viewId ? "block" : "none";
    });
  });

  on(SidebarEvents.Resize, (p) => {
    const { width } = p as { width: number };
    dom.sidebarContainer.style.width = `${width}px`;
  });
}

export function wireResizeHandle(dom: DOMRefs) {
  const handle = el("div", {
    style: "position:absolute;right:-2px;top:0;bottom:0;width:4px;cursor:col-resize;z-index:5;",
  });
  dom.sidebarContainer.style.position = "relative";
  dom.sidebarContainer.appendChild(handle);

  let dragging = false;
  let startX = 0;
  let startW = 0;

  handle.addEventListener("mousedown", (e) => {
    dragging = true;
    startX = e.clientX;
    startW = dom.sidebarContainer.offsetWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const newW = Math.max(170, Math.min(600, startW + (e.clientX - startX)));
    dom.sidebarContainer.style.width = `${newW}px`;
  });

  document.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });
}
