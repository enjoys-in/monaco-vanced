// ── Sidebar visibility — responsive show/hide + backdrop ────

import { SidebarEvents } from "@enjoys/monaco-vanced/core/events";
import type { DOMRefs, OnHandler } from "../types";

export function wireSidebarVisibility(dom: DOMRefs, on: OnHandler) {
  let sidebarVisible = true;
  const narrowMq = window.matchMedia("(max-width: 768px)");

  function isNarrow() {
    return narrowMq.matches;
  }

  function showSidebar() {
    sidebarVisible = true;
    if (isNarrow()) {
      dom.sidebarContainer.classList.add("vsc-sidebar--visible");
      dom.sidebarBackdrop.classList.add("vsc-sidebar-backdrop--visible");
    } else {
      dom.sidebarContainer.style.display = "flex";
    }
  }

  function hideSidebar() {
    sidebarVisible = false;
    if (isNarrow()) {
      dom.sidebarContainer.classList.remove("vsc-sidebar--visible");
      dom.sidebarBackdrop.classList.remove("vsc-sidebar-backdrop--visible");
    } else {
      dom.sidebarContainer.style.display = "none";
    }
  }

  // Auto-collapse sidebar when viewport shrinks below 768px
  narrowMq.addEventListener("change", (e) => {
    if (e.matches) {
      dom.sidebarContainer.style.display = "";
      dom.sidebarContainer.classList.remove("vsc-sidebar--visible");
      dom.sidebarBackdrop.classList.remove("vsc-sidebar-backdrop--visible");
      sidebarVisible = false;
    } else {
      dom.sidebarContainer.classList.remove("vsc-sidebar--visible");
      dom.sidebarBackdrop.classList.remove("vsc-sidebar-backdrop--visible");
      dom.sidebarContainer.style.display = sidebarVisible ? "flex" : "none";
    }
  });

  // Click backdrop to dismiss sidebar overlay
  dom.sidebarBackdrop.addEventListener("click", () => {
    if (isNarrow() && sidebarVisible) hideSidebar();
  });

  on(SidebarEvents.ViewActivate, (_p) => {
    if (!sidebarVisible) showSidebar();
  });

  on(SidebarEvents.Toggle, () => {
    if (sidebarVisible) hideSidebar();
    else showSidebar();
  });
}
