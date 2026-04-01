// ── Tab bar — open, close, switch, dirty + breadcrumbs ──────

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { TabEvents, FileEvents } from "@enjoys/monaco-vanced/core/events";
import type { DOMRefs, OnHandler, VirtualFile } from "../types";
import { C } from "../types";
import { el, fileIconSvg, getExt } from "../utils";

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
        eventBus.emit("welcome:show", {});
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

  // ── File renamed → update tab label, uri key, icon ─────────
  on(FileEvents.Renamed, (p) => {
    const { oldUri, newUri } = p as { oldUri: string; newUri: string };
    const entry = openTabs.get(oldUri);
    if (!entry) return;

    // Update map key
    openTabs.delete(oldUri);
    const newLabel = newUri.split("/").pop() ?? newUri;
    entry.label = newLabel;
    entry.el.setAttribute("data-uri", newUri);
    openTabs.set(newUri, entry);

    // Update label text
    const labelSpan = entry.el.querySelector("span:nth-child(2)") as HTMLElement;
    if (labelSpan) labelSpan.textContent = newLabel;

    // Update file icon
    const iconSpan = entry.el.querySelector("span:first-child") as HTMLElement;
    if (iconSpan) iconSpan.innerHTML = fileIconSvg(getExt(newLabel));

    // Rewire click to emit new uri
    entry.el.onclick = () => eventBus.emit(FileEvents.Open, { uri: newUri, label: newLabel });

    // If this was the active tab, update breadcrumb + title
    if (activeTabUri === oldUri) {
      activeTabUri = newUri;
      updateBreadcrumb(newUri);
      dom.titleCenter.textContent = newLabel;
      document.title = `${newLabel} — Monaco Vanced`;
    }

    // Update the fileMap too
    fileMap.delete(oldUri);
    fileMap.set(newUri, { uri: newUri, name: newLabel, language: "", content: "" });
  });

  // ── File deleted → mark tab red + strikethrough, then close ─
  on(FileEvents.Deleted, (p) => {
    const { uri } = p as { uri: string };
    const entry = openTabs.get(uri);
    if (!entry) return;

    // Visual: red tint + strikethrough
    const labelSpan = entry.el.querySelector("span:nth-child(2)") as HTMLElement;
    if (labelSpan) {
      labelSpan.style.textDecoration = "line-through";
      labelSpan.style.color = C.errorRed;
      labelSpan.style.opacity = "0.7";
    }
    entry.el.style.borderTop = `1px solid ${C.errorRed}`;

    // Auto-close after a short delay so user sees the feedback
    setTimeout(() => closeTab(uri), 1500);
  });

  // ── Special tabs (Settings, Welcome, etc.) ─────────────────
  on("tab:open-special", (p) => {
    const { uri, label } = p as { uri: string; label: string };
    if (!openTabs.has(uri)) {
      const tab = createSpecialTabElement(uri, label, eventBus);
      dom.tabList.appendChild(tab);
      openTabs.set(uri, { el: tab, label });
    }
    activateSpecialTab(uri);
  });

  function activateSpecialTab(uri: string) {
    activeTabUri = uri;
    openTabs.forEach((t, tabUri) => {
      const isActive = tabUri === uri;
      t.el.style.background = isActive ? C.tabActiveBg : C.tabInactiveBg;
      t.el.style.color = isActive ? C.fgBright : C.fgDim;
      t.el.style.borderBottom = isActive ? `1px solid ${C.tabActiveBg}` : "1px solid transparent";
      t.el.style.borderTop = isActive ? `1px solid ${C.accent}` : "1px solid transparent";
    });
    const entry = openTabs.get(uri);
    dom.titleCenter.textContent = entry?.label ?? uri;
    dom.breadcrumbBar.innerHTML = "";
    const crumb = el("span", { style: `color:${C.fg};font-size:12px;` }, entry?.label ?? uri);
    dom.breadcrumbBar.appendChild(crumb);
  }
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

function createSpecialTabElement(uri: string, label: string, eventBus: EventBus): HTMLElement {
  const tab = el("div", {
    "data-uri": uri,
    style: `display:flex;align-items:center;gap:6px;padding:0 10px;height:100%;cursor:pointer;border-right:1px solid ${C.border};font-size:13px;white-space:nowrap;background:${C.tabInactiveBg};color:${C.fgDim};position:relative;min-width:0;border-top:1px solid transparent;border-bottom:1px solid transparent;`,
  });

  tab.addEventListener("click", () => eventBus.emit("tab:switch-special", { uri, label }));
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

  // Gear icon for settings tab
  const icon = el("span", { style: `display:inline-flex;align-items:center;flex-shrink:0;color:${C.fgDim};` });
  icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M9.1 4.4L8.6 2H7.4l-.5 2.4-.7.3-2-1.3-.9.8 1.3 2-.3.7-2.4.5v1.2l2.4.5.3.7-1.3 2 .8.8 2-1.3.7.3.5 2.4h1.2l.5-2.4.7-.3 2 1.3.9-.8-1.3-2 .3-.7 2.4-.5V6.8l-2.4-.5-.3-.7 1.3-2-.8-.8-2 1.3-.7-.3zM8 10a2 2 0 110-4 2 2 0 010 4z"/></svg>`;

  const labelSpan = el("span", { style: "overflow:hidden;text-overflow:ellipsis;" }, label);

  // Close button
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

  tab.addEventListener("auxclick", (e) => {
    if (e.button === 1) { e.preventDefault(); eventBus.emit(TabEvents.Close, { uri }); }
  });

  tab.append(icon, labelSpan, closeBtn);
  return tab;
}

/** Reset (exposed for external use) */
export function getActiveTabUri(): string | null {
  return activeTabUri;
}
