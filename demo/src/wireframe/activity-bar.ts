// ── Activity bar — icon strip on the far left ──────────────

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { SidebarEvents } from "@enjoys/monaco-vanced/core/events";
import type { DOMRefs, WireframeAPIs, OnHandler } from "./types";
import { C } from "./types";
import { el } from "./utils";

// VS Code codicon-style SVG icons (16×16 viewBox)
const ICONS: { id: string; label: string; svg: string }[] = [
  { id: "explorer", label: "Explorer (Ctrl+Shift+E)", svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M17.5 0h-9L7 1.5V6H2.5L1 7.5v13l1.5 1.5h9l1.5-1.5V17h4.5l1.5-1.5v-14L17.5 0zm-5 20.5H2.5v-13H7v8.5l1.5 1.5h4v3zm6-5H8.5v-14h5V6l1 1h4v8.5z" fill="currentColor"/></svg>` },
  { id: "search", label: "Search (Ctrl+Shift+F)", svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15.25 0a8.25 8.25 0 00-6.18 13.72L1 21.79l1.42 1.42 8.07-8.07A8.25 8.25 0 1015.25.01V0zm0 15a6.75 6.75 0 110-13.5 6.75 6.75 0 010 13.5z" fill="currentColor"/></svg>` },
  { id: "scm", label: "Source Control (Ctrl+Shift+G)", svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21.007 8.222A3.738 3.738 0 0015.045 5.2a3.738 3.738 0 001.156 6.583 2.988 2.988 0 01-2.668 1.67h-2.99a4.456 4.456 0 00-2.989 1.165V7.753a3.737 3.737 0 002.991-3.253 3.737 3.737 0 10-7.474 0 3.737 3.737 0 002.991 3.253v8.494a3.737 3.737 0 00-2.991 3.253 3.737 3.737 0 107.474 0 3.737 3.737 0 00-2.991-3.253v-.508a2.988 2.988 0 012.99-2.992h2.99a4.456 4.456 0 004.487-3.385 3.737 3.737 0 001.497-1.142z" fill="currentColor"/></svg>` },
  { id: "debug", label: "Run and Debug (Ctrl+Shift+D)", svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M10.94 13.5l-1.32 1.32a3.73 3.73 0 00-7.24 0L1.06 13.5 0 14.56l1.72 1.72-.22.22V18H0v1.5h1.5v.08c.077.489.214.966.41 1.42L.47 22.44 1.53 23.5l1.34-1.34A3.74 3.74 0 005.5 23.5a3.74 3.74 0 002.63-1.34l1.34 1.34 1.06-1.06-1.44-1.44c.196-.454.333-.931.41-1.42V19H11v-1.5H9.5v-1.5l-.22-.22L11 14.06l-1.06-1.06zM5.5 21.5a2.25 2.25 0 01-2.25-2.25v-2c0-.18.022-.357.065-.53a2.25 2.25 0 014.37 0c.043.173.065.35.065.53v2A2.25 2.25 0 015.5 21.5zM18.5 0A3.5 3.5 0 0015 3.5a3.465 3.465 0 00.605 1.96l-4.07 4.07 1.06 1.06 4.07-4.07c.577.377 1.252.58 1.945.58h-.11A3.5 3.5 0 0018.5 0zm0 5.5a2 2 0 110-4 2 2 0 010 4z" fill="currentColor"/></svg>` },
  { id: "extensions", label: "Extensions (Ctrl+Shift+X)", svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M13.5 1.5L15 0h7.5L24 1.5V9l-1.5 1.5H15L13.5 9V1.5zM0 15l1.5-1.5H9L10.5 15v7.5L9 24H1.5L0 22.5V15zm0-12L1.5 1.5H9L10.5 3v7.5L9 12H1.5L0 10.5V3zm13.5 12L15 13.5h7.5L24 15v7.5L22.5 24H15l-1.5-1.5V15z" fill="currentColor"/></svg>` },
];

const BOTTOM_ICONS: { id: string; label: string; svg: string }[] = [
  { id: "accounts", label: "Accounts", svg: `<svg width="24" height="24" viewBox="0 0 16 16" fill="none"><path d="M16 7.992C16 3.58 12.416 0 8 0S0 3.58 0 7.992c0 2.43 1.104 4.612 2.832 6.088.016.016.032.016.032.032.144.112.288.224.448.336.08.048.144.111.224.175A7.98 7.98 0 008.016 16a7.98 7.98 0 004.48-1.377c.08-.048.144-.111.224-.16.144-.128.304-.224.448-.336.016-.016.032-.016.032-.032A7.995 7.995 0 0016 7.992zm-8 6.513a6.493 6.493 0 01-3.6-1.09 4 4 0 017.2 0 6.493 6.493 0 01-3.6 1.09zM5.5 7a2.5 2.5 0 015 0 2.5 2.5 0 01-5 0zm8.065 5.408a5.493 5.493 0 00-3.214-2.688A4.001 4.001 0 008 3.5a4 4 0 00-2.35 6.22 5.494 5.494 0 00-3.214 2.688A6.491 6.491 0 011.5 7.992 6.494 6.494 0 018 1.5a6.494 6.494 0 016.5 6.492 6.49 6.49 0 01-1.935 4.416z" fill="currentColor"/></svg>` },
  { id: "settings-gear", label: "Manage", svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M19.85 8.75l4.15.83v4.84l-4.15.83 2.35 3.52-3.42 3.42-3.52-2.35-.83 4.16H9.58l-.84-4.15-3.52 2.35-3.42-3.43 2.35-3.52L0 12.42V7.58l4.15-.84L1.8 3.22 5.22 1.8l3.52 2.35L9.58 0h4.84l.84 4.15 3.52-2.35 3.42 3.42-2.35 3.53zM12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" fill="currentColor"/></svg>` },
];

export function wireActivityBar(
  dom: DOMRefs,
  apis: WireframeAPIs,
  eventBus: EventBus,
  on: OnHandler,
) {
  let activeId = "explorer";

  // Create top buttons
  ICONS.forEach(({ id, label, svg }) => {
    dom.activityBar.appendChild(makeBtn(id, label, svg));
  });

  // Create bottom buttons (accounts + settings gear)
  BOTTOM_ICONS.forEach(({ id, label, svg }) => {
    dom.activityBottom.appendChild(makeBtn(id, label, svg));
  });

  function makeBtn(id: string, label: string, svg: string): HTMLElement {
    const isTop = ICONS.some((i) => i.id === id);
    const isActive = isTop && id === activeId;
    const btn = el("div", {
      class: "vsc-activity-btn",
      title: label,
      "data-id": id,
      style: `width:48px;height:48px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:${isActive ? C.activeIcon : C.inactiveIcon};border-left:2px solid ${isActive ? C.fgBright : "transparent"};box-sizing:border-box;position:relative;`,
    });
    btn.innerHTML = svg;
    const svgEl = btn.querySelector("svg");
    if (svgEl) svgEl.style.cssText = "width:22px;height:22px;";
    btn.addEventListener("click", () => {
      if (id === "settings-gear") {
        eventBus.emit("file:open", { uri: "settings.json", label: "Settings" });
        return;
      }
      if (!isTop) return;
      if (activeId === id) {
        apis.sidebar?.toggle();
      } else {
        activeId = id;
        apis.sidebar?.activateView(id);
      }
      updateAll();
    });
    return btn;
  }

  function updateAll() {
    const topBtns = dom.activityBar.children;
    for (let i = 0; i < topBtns.length; i++) {
      const btn = topBtns[i] as HTMLElement;
      const icon = ICONS[i];
      if (!icon) continue;
      const isActive = icon.id === activeId;
      btn.style.color = isActive ? C.activeIcon : C.inactiveIcon;
      btn.style.borderLeft = `2px solid ${isActive ? C.fgBright : "transparent"}`;
    }
  }

  on(SidebarEvents.ViewActivate, (p) => {
    const { viewId } = p as { viewId: string };
    activeId = viewId;
    updateAll();
  });

  on(SidebarEvents.Toggle, () => {
    const state = apis.sidebar?.getState();
    dom.sidebarContainer.style.display = state?.visible === false ? "none" : "flex";
  });
}
