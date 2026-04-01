// ── Tab bar — open, close, switch, dirty, context menu, breadcrumbs ──

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { TabEvents, FileEvents, LayoutEvents, SidebarEvents, WelcomeEvents } from "@enjoys/monaco-vanced/core/events";
import type { DOMRefs, OnHandler, VirtualFile } from "../types";
import { C } from "../types";
import { el, fileIconSvg, getExt, langColor } from "../utils";
import type { ExplorerIconAPI } from "../../explorer";

// ── Icon resolver — uses icon API if available, else fallback SVG ────
let globalIconApi: ExplorerIconAPI | undefined;

function renderTabIcon(filename: string): HTMLElement {
  const icon = el("span", {
    class: "tab-icon",
    style: `display:inline-flex;align-items:center;flex-shrink:0;`,
  });
  if (globalIconApi) {
    const url = globalIconApi.getFileIcon(filename);
    if (url) {
      const img = document.createElement("img");
      img.src = url;
      img.width = 16;
      img.height = 16;
      img.style.cssText = "display:block;";
      img.onerror = () => {
        img.replaceWith(createFallbackIcon(filename));
      };
      icon.appendChild(img);
      return icon;
    }
  }
  icon.appendChild(createFallbackIcon(filename));
  return icon;
}

function createFallbackIcon(filename: string): HTMLElement {
  const ext = getExt(filename);
  const color = langColor(ext);
  const span = el("span", { style: `display:inline-flex;align-items:center;color:${color};` });
  span.innerHTML = fileIconSvg(ext);
  return span;
}

// ── State ────────────────────────────────────────────────────
interface TabEntry {
  el: HTMLElement;
  label: string;
  uri: string;
  dirty: boolean;
  pinned: boolean;
}

const openTabs = new Map<string, TabEntry>();
let activeTabUri: string | null = null;

export function getActiveTabUri(): string | null {
  return activeTabUri;
}

export function wireTabs(
  dom: DOMRefs,
  eventBus: EventBus,
  on: OnHandler,
  files: VirtualFile[],
  iconApi?: ExplorerIconAPI,
) {
  globalIconApi = iconApi;
  const fileMap = new Map(files.map((f) => [f.uri, f]));

  // ── Tab open (from file:open or tab:open) ──────────────────
  function openTab(uri: string, label?: string) {
    if (!openTabs.has(uri)) {
      const name = label ?? uri.split("/").pop() ?? uri;
      const tab = createTabElement(uri, name, eventBus, showTabContextMenu);
      dom.tabList.appendChild(tab);
      openTabs.set(uri, { el: tab, label: name, uri, dirty: false, pinned: false });
    }
    activateTab(uri);
  }

  // ── Switch / activate ──────────────────────────────────────
  function activateTab(uri: string) {
    activeTabUri = uri;
    openTabs.forEach((t, tabUri) => {
      const isActive = tabUri === uri;
      applyTabStyle(t.el, isActive);
    });
    updateBreadcrumb(uri);
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
      const remaining = [...openTabs.keys()];
      if (remaining.length > 0) {
        const next = remaining[remaining.length - 1];
        eventBus.emit(FileEvents.Open, { uri: next, label: openTabs.get(next)?.label ?? next });
      } else {
        activeTabUri = null;
        dom.breadcrumbBar.innerHTML = "";
        dom.titleCenter.textContent = "Monaco Vanced";
        document.title = "Monaco Vanced";
        eventBus.emit(WelcomeEvents.Show, {});
      }
    }
  }

  function closeOtherTabs(keepUri: string) {
    const uris = [...openTabs.keys()].filter((u) => u !== keepUri);
    for (const u of uris) closeTab(u);
  }

  function closeTabsToRight(uri: string) {
    const keys = [...openTabs.keys()];
    const idx = keys.indexOf(uri);
    if (idx < 0) return;
    for (let i = keys.length - 1; i > idx; i--) closeTab(keys[i]);
  }

  function closeTabsToLeft(uri: string) {
    const keys = [...openTabs.keys()];
    const idx = keys.indexOf(uri);
    if (idx < 0) return;
    for (let i = idx - 1; i >= 0; i--) closeTab(keys[i]);
  }

  function closeSavedTabs() {
    const uris = [...openTabs.entries()].filter(([, t]) => !t.dirty).map(([u]) => u);
    for (const u of uris) closeTab(u);
  }

  function closeAllTabs() {
    const uris = [...openTabs.keys()];
    for (const u of uris) closeTab(u);
  }

  // ── Tab context menu ───────────────────────────────────────
  function showTabContextMenu(uri: string, x: number, y: number) {
    const entry = openTabs.get(uri);
    if (!entry) return;

    const keys = [...openTabs.keys()];
    const idx = keys.indexOf(uri);
    const hasRight = idx < keys.length - 1;
    const hasLeft = idx > 0;
    const hasOthers = keys.length > 1;

    renderTabContextMenu(dom, x, y, [
      { label: "Close", shortcut: "Ctrl+W", action: () => closeTab(uri) },
      { label: "Close Others", disabled: !hasOthers, action: () => closeOtherTabs(uri) },
      { label: "Close to the Right", disabled: !hasRight, action: () => closeTabsToRight(uri) },
      { label: "Close to the Left", disabled: !hasLeft, action: () => closeTabsToLeft(uri) },
      { label: "Close Saved", action: () => closeSavedTabs() },
      { label: "Close All", action: () => closeAllTabs() },
      { type: "separator" },
      { label: "Copy Path", action: () => { navigator.clipboard.writeText(uri); } },
      { label: "Copy Relative Path", action: () => { navigator.clipboard.writeText(uri); } },
      { type: "separator" },
      { label: "Split Right", action: () => { eventBus.emit(LayoutEvents.Split, { direction: "right", uri }); } },
      { label: "Split Down", action: () => { eventBus.emit(LayoutEvents.Split, { direction: "down", uri }); } },
      { type: "separator" },
      { label: entry.pinned ? "Unpin" : "Pin Tab", action: () => {
        entry.pinned = !entry.pinned;
        entry.el.style.fontStyle = entry.pinned ? "italic" : "normal";
        eventBus.emit(TabEvents.Pin, { uri, pinned: entry.pinned });
      }},
      { label: "Reveal in Explorer", action: () => { eventBus.emit(SidebarEvents.ViewActivate, { viewId: "explorer" }); } },
    ]);
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
    entry.dirty = dirty;
    const dot = entry.el.querySelector(".dirty-indicator") as HTMLElement;
    const close = entry.el.querySelector(".tab-close") as HTMLElement;
    if (dot) dot.style.display = dirty ? "inline-block" : "none";
    if (close) close.style.display = dirty ? "none" : "";
    // Update label style to indicate modifications
    const labelSpan = entry.el.querySelector(".tab-label") as HTMLElement;
    if (labelSpan) labelSpan.style.fontStyle = dirty ? "italic" : "normal";
  });

  on(TabEvents.Reorder, (p) => {
    const { order } = p as { order: string[] };
    order.forEach((uri) => {
      const entry = openTabs.get(uri);
      if (entry) dom.tabList.appendChild(entry.el);
    });
  });

  // ── File renamed → update tab ──────────────────────────────
  on(FileEvents.Renamed, (p) => {
    const { oldUri, newUri } = p as { oldUri: string; newUri: string };
    const entry = openTabs.get(oldUri);
    if (!entry) return;

    openTabs.delete(oldUri);
    const newLabel = newUri.split("/").pop() ?? newUri;
    entry.label = newLabel;
    entry.uri = newUri;
    entry.el.setAttribute("data-uri", newUri);
    openTabs.set(newUri, entry);

    const labelSpan = entry.el.querySelector(".tab-label") as HTMLElement;
    if (labelSpan) labelSpan.textContent = newLabel;

    const iconSpan = entry.el.querySelector(".tab-icon") as HTMLElement;
    if (iconSpan) {
      iconSpan.innerHTML = "";
      const newIcon = renderTabIcon(newLabel);
      iconSpan.replaceWith(newIcon);
    }

    entry.el.onclick = () => eventBus.emit(FileEvents.Open, { uri: newUri, label: newLabel });

    if (activeTabUri === oldUri) {
      activeTabUri = newUri;
      updateBreadcrumb(newUri);
      dom.titleCenter.textContent = newLabel;
      document.title = `${newLabel} — Monaco Vanced`;
    }

    fileMap.delete(oldUri);
    fileMap.set(newUri, { uri: newUri, name: newLabel, language: "", content: "" });
  });

  // ── File deleted → mark tab red, then close ────────────────
  on(FileEvents.Deleted, (p) => {
    const { uri } = p as { uri: string };
    const entry = openTabs.get(uri);
    if (!entry) return;

    const labelSpan = entry.el.querySelector(".tab-label") as HTMLElement;
    if (labelSpan) {
      labelSpan.style.textDecoration = "line-through";
      labelSpan.style.color = C.errorRed;
      labelSpan.style.opacity = "0.7";
    }
    entry.el.style.borderTop = `1px solid ${C.errorRed}`;
    setTimeout(() => closeTab(uri), 1500);
  });

  // ── Special tabs (Settings, etc.) ──────────────────────────
  on(TabEvents.OpenSpecial, (p) => {
    const { uri, label } = p as { uri: string; label: string };
    if (!openTabs.has(uri)) {
      const tab = createSpecialTabElement(uri, label, eventBus, showTabContextMenu);
      dom.tabList.appendChild(tab);
      openTabs.set(uri, { el: tab, label, uri, dirty: false, pinned: false });
    }
    activateSpecialTab(uri);
  });

  function activateSpecialTab(uri: string) {
    activeTabUri = uri;
    openTabs.forEach((t, tabUri) => {
      const isActive = tabUri === uri;
      applyTabStyle(t.el, isActive);
    });
    const entry = openTabs.get(uri);
    dom.titleCenter.textContent = entry?.label ?? uri;
    dom.breadcrumbBar.innerHTML = "";
    const crumb = el("span", { style: `color:${C.fg};font-size:12px;` }, entry?.label ?? uri);
    dom.breadcrumbBar.appendChild(crumb);
  }
}

// ══════════════════════════════════════════════════════════════
// Tab element factory
// ══════════════════════════════════════════════════════════════

function applyTabStyle(tab: HTMLElement, isActive: boolean) {
  tab.style.background = isActive ? C.tabActiveBg : C.tabInactiveBg;
  tab.style.color = isActive ? C.fgBright : C.fgDim;
  tab.style.borderBottom = isActive ? `1px solid ${C.tabActiveBg}` : "1px solid transparent";
  tab.style.borderTop = isActive ? `2px solid ${C.accent}` : "2px solid transparent";
}

function createTabElement(
  uri: string,
  label: string,
  eventBus: EventBus,
  onContextMenu: (uri: string, x: number, y: number) => void,
): HTMLElement {
  const tab = el("div", {
    "data-uri": uri,
    style: `display:flex;align-items:center;gap:6px;padding:0 12px;height:100%;cursor:pointer;border-right:1px solid ${C.border};font-size:13px;white-space:nowrap;background:${C.tabInactiveBg};color:${C.fgDim};position:relative;min-width:0;border-top:2px solid transparent;border-bottom:1px solid transparent;transition:background .1s;user-select:none;`,
  });

  // Click → open file
  tab.addEventListener("click", () => eventBus.emit(FileEvents.Open, { uri, label }));

  // Hover
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

  // Right-click → context menu
  tab.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(uri, e.clientX, e.clientY);
  });

  // Middle-click → close
  tab.addEventListener("auxclick", (e) => {
    if (e.button === 1) { e.preventDefault(); eventBus.emit(TabEvents.Close, { uri }); }
  });

  // ── Icon ───────────────────────────────────────────────────
  const icon = renderTabIcon(label);

  // ── Label ──────────────────────────────────────────────────
  const labelSpan = el("span", {
    class: "tab-label",
    style: "overflow:hidden;text-overflow:ellipsis;max-width:120px;",
  }, label);

  // ── Dirty indicator (circle dot — hidden by default) ───────
  const dirty = el("span", {
    class: "dirty-indicator",
    style: `display:none;width:8px;height:8px;min-width:8px;border-radius:50%;background:${C.fg};flex-shrink:0;margin-left:auto;`,
  });

  // ── Close button ───────────────────────────────────────────
  const closeBtn = el("span", {
    class: "tab-close",
    style: `line-height:1;cursor:pointer;opacity:0;padding:2px;border-radius:3px;display:flex;align-items:center;justify-content:center;width:18px;height:18px;flex-shrink:0;color:${C.fgDim};transition:opacity .12s,background .1s;`,
  });
  closeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16"><path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z" fill="currentColor"/></svg>`;
  closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "rgba(255,255,255,0.1)"; });
  closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = "transparent"; });
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    eventBus.emit(TabEvents.Close, { uri });
  });

  tab.append(icon, labelSpan, dirty, closeBtn);
  return tab;
}

function createSpecialTabElement(
  uri: string,
  label: string,
  eventBus: EventBus,
  onContextMenu: (uri: string, x: number, y: number) => void,
): HTMLElement {
  const tab = el("div", {
    "data-uri": uri,
    style: `display:flex;align-items:center;gap:6px;padding:0 12px;height:100%;cursor:pointer;border-right:1px solid ${C.border};font-size:13px;white-space:nowrap;background:${C.tabInactiveBg};color:${C.fgDim};position:relative;min-width:0;border-top:2px solid transparent;border-bottom:1px solid transparent;transition:background .1s;user-select:none;`,
  });

  tab.addEventListener("click", () => eventBus.emit(TabEvents.SwitchSpecial, { uri, label }));
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
  tab.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(uri, e.clientX, e.clientY);
  });
  tab.addEventListener("auxclick", (e) => {
    if (e.button === 1) { e.preventDefault(); eventBus.emit(TabEvents.Close, { uri }); }
  });

  const icon = el("span", {
    class: "tab-icon",
    style: `display:inline-flex;align-items:center;flex-shrink:0;color:${C.fgDim};`,
  });
  icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M9.1 4.4L8.6 2H7.4l-.5 2.4-.7.3-2-1.3-.9.8 1.3 2-.3.7-2.4.5v1.2l2.4.5.3.7-1.3 2 .8.8 2-1.3.7.3.5 2.4h1.2l.5-2.4.7-.3 2 1.3.9-.8-1.3-2 .3-.7 2.4-.5V6.8l-2.4-.5-.3-.7 1.3-2-.8-.8-2 1.3-.7-.3zM8 10a2 2 0 110-4 2 2 0 010 4z"/></svg>`;

  const labelSpan = el("span", {
    class: "tab-label",
    style: "overflow:hidden;text-overflow:ellipsis;",
  }, label);

  const closeBtn = el("span", {
    class: "tab-close",
    style: `line-height:1;cursor:pointer;opacity:0;padding:2px;border-radius:3px;display:flex;align-items:center;justify-content:center;width:18px;height:18px;flex-shrink:0;color:${C.fgDim};transition:opacity .12s,background .1s;`,
  });
  closeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16"><path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z" fill="currentColor"/></svg>`;
  closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "rgba(255,255,255,0.1)"; });
  closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = "transparent"; });
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    eventBus.emit(TabEvents.Close, { uri });
  });

  tab.append(icon, labelSpan, closeBtn);
  return tab;
}

// ══════════════════════════════════════════════════════════════
// Tab context menu (inline — rendered directly)
// ══════════════════════════════════════════════════════════════

interface TabMenuItem {
  label?: string;
  shortcut?: string;
  type?: "separator";
  disabled?: boolean;
  action?: () => void;
}

let activeContextMenu: HTMLElement | null = null;

function dismissTabContextMenu() {
  if (activeContextMenu) {
    activeContextMenu.remove();
    activeContextMenu = null;
  }
}

function renderTabContextMenu(dom: DOMRefs, x: number, y: number, items: TabMenuItem[]) {
  dismissTabContextMenu();

  const menu = el("div", {
    style: `position:fixed;z-index:9999;background:${C.menuBg};border:1px solid ${C.borderLight};border-radius:6px;padding:4px 0;min-width:220px;box-shadow:0 6px 24px rgba(0,0,0,0.5);backdrop-filter:saturate(180%) blur(8px);`,
  });

  // Viewport clamping
  const maxX = window.innerWidth - 240;
  const maxY = window.innerHeight - items.length * 28 - 20;
  menu.style.left = `${Math.min(x, maxX)}px`;
  menu.style.top = `${Math.min(y, Math.max(0, maxY))}px`;

  items.forEach((item) => {
    if (item.type === "separator") {
      menu.appendChild(el("div", { style: `height:1px;background:${C.border};margin:4px 0;` }));
      return;
    }

    const disabled = item.disabled ?? false;
    const row = el("div", {
      style: `display:flex;align-items:center;padding:4px 16px;cursor:${disabled ? "default" : "pointer"};font-size:13px;color:${disabled ? C.fgDim : C.fg};min-height:26px;opacity:${disabled ? "0.5" : "1"};`,
    });

    const label = el("span", { style: "flex:1;" }, item.label ?? "");
    row.appendChild(label);

    if (item.shortcut) {
      const kb = el("span", {
        style: `color:${C.fgDim};font-size:11px;margin-left:24px;`,
      }, item.shortcut);
      row.appendChild(kb);
    }

    if (!disabled) {
      row.addEventListener("mouseenter", () => { row.style.background = C.listActive; });
      row.addEventListener("mouseleave", () => { row.style.background = "transparent"; });
      row.addEventListener("click", () => {
        dismissTabContextMenu();
        item.action?.();
      });
    }

    menu.appendChild(row);
  });

  document.body.appendChild(menu);
  activeContextMenu = menu;

  // Close on outside click
  const closeHandler = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node)) {
      dismissTabContextMenu();
      document.removeEventListener("mousedown", closeHandler);
    }
  };
  // Defer so the current right-click doesn't immediately close
  requestAnimationFrame(() => document.addEventListener("mousedown", closeHandler));
}
