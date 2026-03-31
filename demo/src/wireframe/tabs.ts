// ── Tab bar — open, close, switch, dirty + breadcrumbs ──────

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { TabEvents, FileEvents } from "@enjoys/monaco-vanced/core/events";
import type { DOMRefs, OnHandler, VirtualFile } from "./types";
import { C } from "./types";
import { el, fileIconSvg, getExt } from "./utils";

const openTabs = new Map<string, { el: HTMLElement; label: string }>();
let activeTabUri: string | null = null;

export function wireTabs(
  dom: DOMRefs,
  eventBus: EventBus,
  on: OnHandler,
  files: VirtualFile[],
) {
  const fileMap = new Map(files.map((f) => [f.uri, f]));

  // ── Tab open (from file:open or tab:open) ──────────────────
  function openTab(uri: string, label?: string) {
    if (!openTabs.has(uri)) {
      const name = label ?? uri.split("/").pop() ?? uri;
      const tab = createTabElement(uri, name, eventBus);
      dom.tabList.appendChild(tab);
      openTabs.set(uri, { el: tab, label: name });
    }
    activateTab(uri);
  }

  // ── Switch / activate ──────────────────────────────────────
  function activateTab(uri: string) {
    activeTabUri = uri;
    openTabs.forEach((t, tabUri) => {
      const isActive = tabUri === uri;
      t.el.style.background = isActive ? C.tabActiveBg : C.tabInactiveBg;
      t.el.style.color = isActive ? C.fgBright : C.fgDim;
      t.el.style.borderBottom = isActive ? `1px solid ${C.tabActiveBg}` : "1px solid transparent";
      t.el.style.borderTop = isActive ? `1px solid ${C.accent}` : "1px solid transparent";
    });
    // Update breadcrumb
    updateBreadcrumb(uri);
    // Update title center
    const file = fileMap.get(uri);
    dom.titleCenter.textContent = file ? file.name : uri;
    document.title = `${file?.name ?? uri} — Monaco Vanced`;
  }

  // ── Close tab ──────────────────────────────────────────────
  function closeTab(uri: string) {
    const entry = openTabs.get(uri);
    if (!entry) return;
    entry.el.remove();
    openTabs.delete(uri);

    if (activeTabUri === uri) {
      // Switch to the last remaining tab, or clear
      const remaining = [...openTabs.keys()];
      if (remaining.length > 0) {
        const next = remaining[remaining.length - 1];
        eventBus.emit(FileEvents.Open, { uri: next, label: openTabs.get(next)?.label ?? next });
      } else {
        activeTabUri = null;
        dom.breadcrumbBar.innerHTML = "";
        dom.titleCenter.textContent = "Monaco Vanced";
        document.title = "Monaco Vanced";
      }
    }
  }

  // ── Breadcrumb bar ─────────────────────────────────────────
  function updateBreadcrumb(uri: string) {
    dom.breadcrumbBar.innerHTML = "";
    const parts = uri.split("/");
    parts.forEach((part, i) => {
      if (i > 0) {
        const sep = el("span", { style: `color:${C.fgDim};font-size:11px;margin:0 2px;` }, "›");
        dom.breadcrumbBar.appendChild(sep);
      }
      const isLast = i === parts.length - 1;
      const crumb = el("span", {
        class: "vsc-breadcrumb",
        style: `color:${isLast ? C.fg : C.breadcrumbFg};cursor:pointer;font-size:12px;`,
      }, part);
      dom.breadcrumbBar.appendChild(crumb);
    });
  }

  // ── Event wiring ───────────────────────────────────────────
  on(FileEvents.Open, (p) => {
    const { uri, label } = p as { uri: string; label?: string };
    openTab(uri, label);
  });

  on(TabEvents.Open, (p) => {
    const { uri, label } = p as { uri: string; label: string };
    openTab(uri, label);
  });

  on(TabEvents.Switch, (p) => {
    const { uri } = p as { uri: string };
    activateTab(uri);
  });

  on(TabEvents.Close, (p) => {
    const { uri } = p as { uri: string };
    closeTab(uri);
  });

  on(TabEvents.Dirty, (p) => {
    const { uri, dirty } = p as { uri: string; dirty: boolean };
    const entry = openTabs.get(uri);
    if (!entry) return;
    const dot = entry.el.querySelector(".dirty-indicator") as HTMLElement;
    const close = entry.el.querySelector(".tab-close") as HTMLElement;
    if (dot) dot.style.display = dirty ? "inline-block" : "none";
    if (close) close.style.display = dirty ? "none" : "";
  });

  on(TabEvents.Reorder, (p) => {
    const { order } = p as { order: string[] };
    order.forEach((uri) => {
      const entry = openTabs.get(uri);
      if (entry) dom.tabList.appendChild(entry.el);
    });
  });
}

function createTabElement(uri: string, label: string, eventBus: EventBus): HTMLElement {
  const ext = getExt(label);
  const tab = el("div", {
    "data-uri": uri,
    style: `display:flex;align-items:center;gap:6px;padding:0 10px;height:100%;cursor:pointer;border-right:1px solid ${C.border};font-size:13px;white-space:nowrap;background:${C.tabInactiveBg};color:${C.fgDim};position:relative;min-width:0;border-top:1px solid transparent;border-bottom:1px solid transparent;`,
  });

  tab.addEventListener("click", () => eventBus.emit(FileEvents.Open, { uri, label }));
  tab.addEventListener("mouseenter", () => {
    if (uri !== activeTabUri) tab.style.background = C.hover;
    const close = tab.querySelector(".tab-close") as HTMLElement;
    if (close) close.style.opacity = "1";
  });
  tab.addEventListener("mouseleave", () => {
    if (uri !== activeTabUri) tab.style.background = C.tabInactiveBg;
    const close = tab.querySelector(".tab-close") as HTMLElement;
    if (close) close.style.opacity = "0";
  });

  // File icon
  const icon = el("span", { style: "display:inline-flex;align-items:center;flex-shrink:0;" });
  icon.innerHTML = fileIconSvg(ext);

  const labelSpan = el("span", { style: "overflow:hidden;text-overflow:ellipsis;" }, label);

  // Dirty dot (hidden by default)
  const dirty = el("span", {
    class: "dirty-indicator",
    style: `display:none;width:8px;height:8px;min-width:8px;border-radius:50%;background:${C.fg};flex-shrink:0;`,
  });

  // Close button (codicon X)
  const closeBtn = el("span", {
    class: "tab-close",
    style: `font-size:14px;line-height:1;cursor:pointer;opacity:0;padding:2px;border-radius:3px;display:flex;align-items:center;justify-content:center;width:18px;height:18px;flex-shrink:0;color:${C.fgDim};`,
  });
  closeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16"><path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z" fill="currentColor"/></svg>`;
  closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "rgba(255,255,255,0.1)"; });
  closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = "transparent"; });
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    eventBus.emit(TabEvents.Close, { uri });
  });

  // Middle-click to close
  tab.addEventListener("auxclick", (e) => {
    if (e.button === 1) { e.preventDefault(); eventBus.emit(TabEvents.Close, { uri }); }
  });

  tab.append(icon, labelSpan, dirty, closeBtn);
  return tab;
}

/** Reset (exposed for external use) */
export function getActiveTabUri(): string | null {
  return activeTabUri;
}
