// ── Activity bar — icon strip on the far left ──────────────

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { SidebarEvents } from "@enjoys/monaco-vanced/core/events";
import type { DOMRefs, WireframeAPIs, OnHandler } from "./types";
import { C } from "./types";
import { el, svgIcon } from "./utils";

const ACTIVITY_ICONS: { id: string; label: string; svg: string }[] = [
  { id: "explorer", label: "Explorer", svg: svgIcon("M17.5 0h-9L7 1.5V6H2.5L1 7.5v13l1.5 1.5h9l1.5-1.5V17h4.5l1.5-1.5v-14L17.5 0zM11 20.5H2.5V7.5H7v8.5l1.5 1.5H11v3zm6.5-5H8.5V1.5h5V6l1 1h3.5v8.5H18z", "0 0 20 22") },
  { id: "search", label: "Search", svg: svgIcon("M15.25 0a8.25 8.25 0 0 0-6.18 13.72L1 21.79l1.42 1.42 8.07-8.07A8.25 8.25 0 1 0 15.25 0zm0 15a6.75 6.75 0 1 1 0-13.5 6.75 6.75 0 0 1 0 13.5z") },
  { id: "scm", label: "Source Control", svg: svgIcon("M21.007 8.222A3.738 3.738 0 0 0 15.045 5.2a3.737 3.737 0 0 0 1.156 6.583 2.988 2.988 0 0 1-2.668 1.67h-2.99a4.456 4.456 0 0 0-2.989 1.165V7.753A3.737 3.737 0 0 0 10.545 4.5a3.737 3.737 0 0 0-7.475 0 3.737 3.737 0 0 0 2.992 3.253v8.494A3.737 3.737 0 0 0 3.07 19.5a3.737 3.737 0 0 0 7.474 0 3.737 3.737 0 0 0-2.992-3.253v-.508a2.988 2.988 0 0 1 2.989-2.992h2.99a4.456 4.456 0 0 0 4.488-3.385A3.737 3.737 0 0 0 21.007 8.222z") },
  { id: "extensions", label: "Extensions", svg: svgIcon("M13.5 1.5L15 0h7.5L24 1.5V9l-1.5 1.5H15L13.5 9V1.5zM0 15L1.5 13.5H9L10.5 15v7.5L9 24H1.5L0 22.5V15zm0-12L1.5 1.5H9L10.5 3v7.5L9 12H1.5L0 10.5V3zm13.5 12L15 13.5h7.5L24 15v7.5L22.5 24H15l-1.5-1.5V15z") },
];

export function wireActivityBar(
  dom: DOMRefs,
  apis: WireframeAPIs,
  eventBus: EventBus,
  on: OnHandler,
) {
  let activeId = "explorer";

  ACTIVITY_ICONS.forEach(({ id, label, svg }) => {
    const btn = el("div", {
      title: label,
      style: `width:48px;height:48px;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:${id === activeId ? 1 : 0.5};border-left:2px solid ${id === activeId ? C.fgBright : "transparent"};box-sizing:border-box;`,
    });
    btn.innerHTML = svg;
    btn.querySelector("svg")!.style.cssText = `width:24px;height:24px;fill:${id === activeId ? C.activeIcon : C.inactiveIcon};`;
    btn.addEventListener("click", () => {
      if (activeId === id) {
        apis.sidebar?.toggle();
        eventBus.emit(SidebarEvents.Toggle, {});
      } else {
        activeId = id;
        apis.sidebar?.activateView(id);
      }
      updateActivityIcons();
    });
    dom.activityBar.appendChild(btn);
  });

  function updateActivityIcons() {
    const buttons = dom.activityBar.children;
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i] as HTMLElement;
      const icon = ACTIVITY_ICONS[i];
      const isActive = icon.id === activeId;
      btn.style.opacity = isActive ? "1" : "0.5";
      btn.style.borderLeft = `2px solid ${isActive ? C.fgBright : "transparent"}`;
      const svg = btn.querySelector("svg");
      if (svg) svg.style.fill = isActive ? C.activeIcon : C.inactiveIcon;
    }
  }

  on(SidebarEvents.ViewActivate, (p) => {
    const { viewId } = p as { viewId: string };
    activeId = viewId;
    updateActivityIcons();
  });

  on(SidebarEvents.Toggle, () => {
    const state = apis.sidebar?.getState();
    dom.sidebarContainer.style.display = state?.visible === false ? "none" : "flex";
  });
}
