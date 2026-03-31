// ── Tab bar — open, close, switch, dirty, reorder ──────────

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { TabEvents } from "@enjoys/monaco-vanced/core/events";
import type { DOMRefs, OnHandler } from "./types";
import { C } from "./types";
import { el } from "./utils";

const openTabs = new Map<string, HTMLElement>();
let activeTabUri: string | null = null;

export function wireTabs(dom: DOMRefs, eventBus: EventBus, on: OnHandler) {
  on(TabEvents.Open, (p) => {
    const { uri, label } = p as { uri: string; label: string };
    if (openTabs.has(uri)) return;
    const tab = createTabElement(uri, label, eventBus);
    dom.tabBar.appendChild(tab);
    openTabs.set(uri, tab);
  });

  on(TabEvents.Switch, (p) => {
    const { uri } = p as { uri: string };
    setActiveTab(uri);
  });

  on(TabEvents.Close, (p) => {
    const { uri } = p as { uri: string };
    const tab = openTabs.get(uri);
    if (tab) { tab.remove(); openTabs.delete(uri); }
  });

  on(TabEvents.Dirty, (p) => {
    const { uri, dirty } = p as { uri: string; dirty: boolean };
    const tab = openTabs.get(uri);
    if (!tab) return;
    const dot = tab.querySelector(".dirty-indicator") as HTMLElement;
    if (dot) dot.style.display = dirty ? "inline-block" : "none";
  });

  on(TabEvents.Reorder, (p) => {
    const { order } = p as { order: string[] };
    order.forEach((uri) => {
      const tab = openTabs.get(uri);
      if (tab) dom.tabBar.appendChild(tab);
    });
  });
}

function createTabElement(uri: string, label: string, eventBus: EventBus): HTMLElement {
  const tab = el("div", {
    "data-uri": uri,
    style: `display:flex;align-items:center;gap:6px;padding:0 12px;height:100%;cursor:pointer;border-right:1px solid ${C.border};font-size:13px;white-space:nowrap;background:${C.tabInactiveBg};color:${C.fgDim};position:relative;`,
  });
  tab.addEventListener("click", () => eventBus.emit(TabEvents.Switch, { uri }));
  tab.addEventListener("mouseenter", () => { if (uri !== activeTabUri) tab.style.background = C.hover; });
  tab.addEventListener("mouseleave", () => { if (uri !== activeTabUri) tab.style.background = C.tabInactiveBg; });

  const labelSpan = el("span", {}, label);
  const dirty = el("span", { class: "dirty-indicator", style: `display:none;width:8px;height:8px;border-radius:50%;background:${C.fg};` });
  const closeBtn = el("span", {
    style: "font-size:16px;line-height:1;cursor:pointer;opacity:0;padding:2px;border-radius:3px;",
  }, "×");
  closeBtn.addEventListener("click", (e) => { e.stopPropagation(); eventBus.emit(TabEvents.Close, { uri }); });
  tab.addEventListener("mouseenter", () => { closeBtn.style.opacity = "1"; });
  tab.addEventListener("mouseleave", () => { closeBtn.style.opacity = "0"; });
  tab.append(dirty, labelSpan, closeBtn);
  return tab;
}

function setActiveTab(uri: string) {
  activeTabUri = uri;
  openTabs.forEach((tab, tabUri) => {
    const isActive = tabUri === uri;
    tab.style.background = isActive ? C.tabActiveBg : C.tabInactiveBg;
    tab.style.color = isActive ? C.fgBright : C.fgDim;
    tab.style.borderBottom = isActive ? `1px solid ${C.tabActiveBg}` : "none";
  });
}
