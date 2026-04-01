// ── Title bar menu + Status bar wiring ───────────────────────

import type { StatusbarItem } from "@enjoys/monaco-vanced/layout/statusbar-module";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { StatusbarEvents, HeaderEvents, TitlebarEvents, PanelEvents, FileEvents, SidebarEvents, ContextMenuEvents } from "@enjoys/monaco-vanced/core/events";
import type { DOMRefs, WireframeAPIs, OnHandler } from "./types";
import { C } from "./types";
import { el } from "./utils";

// ── Codicon SVG map (subset used in status bar) ─────────────
const CODICONS: Record<string, string> = {
  "git-branch": `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M14 4a2 2 0 10-2.47 1.94A2.5 2.5 0 019 8.5H7a4.47 4.47 0 00-1 .12V5.94a2 2 0 10-2 0v4.12A2 2 0 106 12a2.5 2.5 0 012.5-2.5H9a4.5 4.5 0 004.45-3.06A2 2 0 0014 4zM5 3a1 1 0 110 2 1 1 0 010-2zm0 10a1 1 0 110-2 1 1 0 010 2zm7-8a1 1 0 110-2 1 1 0 010 2z"/></svg>`,
  "sync": `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2.006 8.267L.78 9.5 0 8.73l2.09-2.07.76.01 2.09 2.12-.71.71-1.34-1.34C3.21 11.03 5.9 13 9 13c1.62 0 3.09-.66 4.17-1.74l.71.71A6.97 6.97 0 019 14c-3.47 0-6.4-2.3-7.38-5.46L.78 9.5zM14 8c0-2.76-2.24-5-5-5a4.99 4.99 0 00-3.88 1.84l1.34 1.34-.71.71L3.66 4.82l-.01-.76L5.72 2l.71.71L5.18 3.96A5.97 5.97 0 019 2c3.31 0 6 2.69 6 6h-1z"/></svg>`,
  "error": `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  "warning": `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M7.56 1.5a.5.5 0 01.88 0l6.5 12A.5.5 0 0114.5 14H1.5a.5.5 0 01-.44-.75l6.5-12zM7.25 6v4h1.5V6h-1.5zm0 5v1.5h1.5V11h-1.5z"/></svg>`,
  "check": `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z"/></svg>`,
  "feedback": `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6 1h4l.5.5V6l4.5 4.5-.5.5-4.5-4.5H6l-.5-.5V1.5L6 1z"/><path d="M1.5 9.5l.5-.5h4l.5.5v4L2 9.5z"/></svg>`,
  "bell": `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.377 10.573a7.63 7.63 0 01-.383-2.38V6.195a5.115 5.115 0 00-1.268-3.446 5.138 5.138 0 00-3.242-1.722c-.694-.072-1.4 0-2.07.227-.67.215-1.28.574-1.794 1.053a4.923 4.923 0 00-1.208 1.675 5.067 5.067 0 00-.431 2.022v2.2a7.61 7.61 0 01-.383 2.37L2 12H6a2 2 0 104 0h4l-.623-1.427zM8 14a1 1 0 01-1-1h2a1 1 0 01-1 1z"/></svg>`,
};

/** Parse "$(icon) text" syntax into HTML with SVG icons */
function parseCodiconLabel(label: string): string {
  return label.replace(/\$\(([^)]+)\)/g, (_, name: string) => {
    const svg = CODICONS[name];
    return svg ? `<span style="display:inline-flex;align-items:center;vertical-align:middle;margin-right:2px;">${svg}</span>` : `$(${name})`;
  });
}

// ── Title bar — menu items + center title ────────────────────

interface MenuDef {
  label: string;
  items: { label: string; command?: string; keybinding?: string; separator?: boolean }[];
}

const MENU_DEFS: MenuDef[] = [
  { label: "File", items: [
    { label: "New File", command: "file.new", keybinding: "Ctrl+N" },
    { label: "Open File", command: "file.open", keybinding: "Ctrl+O" },
    { separator: true, label: "" },
    { label: "Save", command: "file.save", keybinding: "Ctrl+S" },
    { label: "Save All", command: "file.saveAll", keybinding: "Ctrl+K S" },
    { separator: true, label: "" },
    { label: "Close Tab", command: "tab.close", keybinding: "Ctrl+W" },
  ]},
  { label: "Edit", items: [
    { label: "Undo", command: "editor.action.undo", keybinding: "Ctrl+Z" },
    { label: "Redo", command: "editor.action.redo", keybinding: "Ctrl+Y" },
    { separator: true, label: "" },
    { label: "Cut", command: "editor.action.clipboardCutAction", keybinding: "Ctrl+X" },
    { label: "Copy", command: "editor.action.clipboardCopyAction", keybinding: "Ctrl+C" },
    { label: "Paste", command: "editor.action.clipboardPasteAction", keybinding: "Ctrl+V" },
    { separator: true, label: "" },
    { label: "Find", command: "editor.action.startFindAction", keybinding: "Ctrl+F" },
    { label: "Replace", command: "editor.action.startFindReplaceAction", keybinding: "Ctrl+H" },
  ]},
  { label: "Selection", items: [
    { label: "Select All", command: "editor.action.selectAll", keybinding: "Ctrl+A" },
    { label: "Expand Selection", command: "editor.action.smartSelect.expand", keybinding: "Shift+Alt+→" },
    { label: "Shrink Selection", command: "editor.action.smartSelect.shrink", keybinding: "Shift+Alt+←" },
    { separator: true, label: "" },
    { label: "Toggle Comment", command: "editor.action.commentLine", keybinding: "Ctrl+/" },
    { label: "Toggle Block Comment", command: "editor.action.blockComment", keybinding: "Shift+Alt+A" },
  ]},
  { label: "View", items: [
    { label: "Command Palette...", command: "workbench.action.showCommands", keybinding: "Ctrl+Shift+P" },
    { separator: true, label: "" },
    { label: "Explorer", command: "sidebar.explorer", keybinding: "Ctrl+Shift+E" },
    { label: "Search", command: "sidebar.search", keybinding: "Ctrl+Shift+F" },
    { label: "Source Control", command: "sidebar.scm", keybinding: "Ctrl+Shift+G" },
    { label: "Run and Debug", command: "sidebar.debug", keybinding: "Ctrl+Shift+D" },
    { label: "Extensions", command: "sidebar.extensions", keybinding: "Ctrl+Shift+X" },
    { separator: true, label: "" },
    { label: "Toggle Sidebar", command: "workbench.action.toggleSidebar", keybinding: "Ctrl+B" },
    { label: "Toggle Panel", command: "workbench.action.togglePanel", keybinding: "Ctrl+J" },
  ]},
  { label: "Go", items: [
    { label: "Go to File...", command: "workbench.action.quickOpen", keybinding: "Ctrl+P" },
    { label: "Go to Line...", command: "editor.action.gotoLine", keybinding: "Ctrl+G" },
    { label: "Go to Definition", command: "editor.action.revealDefinition", keybinding: "F12" },
    { label: "Go to References", command: "editor.action.goToReferences", keybinding: "Shift+F12" },
  ]},
  { label: "Run", items: [
    { label: "Start Debugging", command: "debug.start", keybinding: "F5" },
    { label: "Run Without Debugging", command: "debug.run", keybinding: "Ctrl+F5" },
    { label: "Stop Debugging", command: "debug.stop", keybinding: "Shift+F5" },
  ]},
  { label: "Terminal", items: [
    { label: "New Terminal", command: "terminal.new", keybinding: "Ctrl+Shift+`" },
    { label: "Toggle Terminal", command: "workbench.action.togglePanel", keybinding: "Ctrl+J" },
  ]},
  { label: "Help", items: [
    { label: "Welcome", command: "help.welcome" },
    { label: "Documentation", command: "help.docs" },
    { label: "About", command: "help.about" },
  ]},
];

export function wireTitleBar(dom: DOMRefs, apis: WireframeAPIs, eventBus: EventBus, on: OnHandler) {
  let openMenu: HTMLElement | null = null;

  function closeMenu() {
    if (openMenu) { openMenu.remove(); openMenu = null; }
  }

  // Build menu bar
  for (const menu of MENU_DEFS) {
    const item = el("div", {
      class: "vsc-menu-item",
      style: `padding:2px 8px;cursor:pointer;font-size:12px;color:${C.fg};user-select:none;-webkit-app-region:no-drag;position:relative;`,
    }, menu.label);

    item.addEventListener("click", (e) => {
      e.stopPropagation();
      if (openMenu) { closeMenu(); return; }
      showDropdown(item, menu, eventBus, apis);
    });

    dom.titleMenuBar.appendChild(item);
  }

  function showDropdown(anchor: HTMLElement, menu: MenuDef, bus: EventBus, api: WireframeAPIs) {
    closeMenu();
    const rect = anchor.getBoundingClientRect();
    const dropdown = el("div", {
      style: `position:fixed;left:${rect.left}px;top:${rect.bottom}px;z-index:9999;background:${C.menuBg};border:1px solid ${C.borderLight};border-radius:6px;padding:4px 0;min-width:220px;box-shadow:0 6px 24px rgba(0,0,0,0.5);`,
    });

    for (const mi of menu.items) {
      if (mi.separator) {
        dropdown.appendChild(el("div", { style: `height:1px;background:${C.border};margin:4px 0;` }));
        continue;
      }
      const row = el("div", {
        style: `display:flex;align-items:center;padding:4px 24px 4px 12px;cursor:pointer;font-size:13px;color:${C.fg};min-height:24px;`,
      });
      row.appendChild(el("span", { style: "flex:1;" }, mi.label));
      if (mi.keybinding) row.appendChild(el("span", { style: `color:${C.fgDim};font-size:12px;margin-left:24px;` }, mi.keybinding));
      row.addEventListener("mouseenter", () => { row.style.background = C.listActive; });
      row.addEventListener("mouseleave", () => { row.style.background = "transparent"; });
      row.addEventListener("click", () => {
        closeMenu();
        if (mi.command) handleMenuCommand(mi.command, bus, api);
      });
      dropdown.appendChild(row);
    }

    document.body.appendChild(dropdown);
    openMenu = dropdown;

    // Close on outside click
    const onOutside = (e: MouseEvent) => {
      if (!dropdown.contains(e.target as Node) && !anchor.contains(e.target as Node)) {
        closeMenu();
        document.removeEventListener("mousedown", onOutside);
      }
    };
    setTimeout(() => document.addEventListener("mousedown", onOutside), 0);
  }

  function handleMenuCommand(cmd: string, bus: EventBus, api: WireframeAPIs) {
    // Sidebar navigation commands
    if (cmd.startsWith("sidebar.")) {
      const viewId = cmd.split(".")[1];
      bus.emit(SidebarEvents.ViewActivate, { viewId });
      return;
    }
    switch (cmd) {
      case "workbench.action.showCommands": bus.emit(HeaderEvents.CommandOpen, {}); break;
      case "workbench.action.toggleSidebar": bus.emit(SidebarEvents.Toggle, {}); break;
      case "workbench.action.togglePanel": bus.emit(PanelEvents.BottomToggle, {}); break;
      case "workbench.action.quickOpen": bus.emit(HeaderEvents.CommandOpen, {}); break;
      case "tab.close": bus.emit("tab:close-active", {}); break;
      case "file.new":
        api.notification?.show({ type: "info", message: "New File: Use the Explorer toolbar to create files.", duration: 3000 });
        break;
      case "file.save":
        api.notification?.show({ type: "success", message: "File saved.", duration: 2000 });
        break;
      case "file.saveAll":
        api.notification?.show({ type: "success", message: "All files saved.", duration: 2000 });
        break;
      case "help.welcome":
        api.notification?.show({ type: "info", message: "Welcome to Antigravity — Monaco Vanced IDE", duration: 4000 });
        break;
      case "help.docs":
        api.notification?.show({ type: "info", message: "Documentation: https://github.com/AkashMondal/monaco-vanced", duration: 5000 });
        break;
      case "help.about":
        api.notification?.show({ type: "info", message: "Monaco Vanced v0.2.0 — Plugin-based IDE Architecture", duration: 4000 });
        break;
      case "debug.start": case "debug.run":
        api.notification?.show({ type: "info", message: "Debugging: Select a launch configuration first.", duration: 3000 });
        break;
      case "debug.stop":
        api.notification?.show({ type: "warning", message: "No active debug session.", duration: 2000 });
        break;
      case "terminal.new":
        bus.emit(PanelEvents.BottomToggle, {}); // ensure panel open
        break;
      default:
        // Try to execute as a Monaco editor action or registered command
        if (api.command) api.command.execute(cmd);
        break;
    }
  }

  on(TitlebarEvents.Update, (p) => {
    const state = p as { fileName?: string; filePath?: string; isDirty?: boolean };
    const parts: string[] = [];
    if (state.fileName) parts.push(state.isDirty ? `● ${state.fileName}` : state.fileName);
    parts.push("— Antigravity");
    dom.titleCenter.textContent = parts.join(" ");
    document.title = parts.join(" ");
  });

  on(HeaderEvents.TitleChange, (p) => {
    const { title } = p as { title: string };
    dom.titleText.textContent = title;
  });

  // ── Header action buttons (layout, sidebar, settings, command palette) ─
  dom.titleActions.querySelectorAll<HTMLElement>("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      switch (btn.dataset.action) {
        case "togglePanel": eventBus.emit(PanelEvents.BottomToggle, {}); break;
        case "toggleSidebar": eventBus.emit(SidebarEvents.Toggle, {}); break;
        case "openSettings": eventBus.emit("settings:ui-open", {}); break;
        case "commandPalette": eventBus.emit(HeaderEvents.CommandOpen, {}); break;
      }
    });
  });
}

// ── Status bar ──────────────────────────────────────────────

export function wireStatusBar(dom: DOMRefs, apis: WireframeAPIs, on: OnHandler) {
  const itemEls = new Map<string, HTMLElement>();

  function renderItem(item: StatusbarItem): HTMLElement {
    const itemEl = el("span", {
      class: "vsc-status-item",
      "data-id": item.id,
      title: item.tooltip ?? "",
      style: `cursor:${item.command ? "pointer" : "default"};padding:0 6px;height:100%;display:${item.visible !== false ? "inline-flex" : "none"};align-items:center;gap:4px;font-size:12px;white-space:nowrap;`,
    });
    if (item.command) {
      itemEl.addEventListener("click", () => apis.command?.execute(item.command!));
    }
    // Parse codicon syntax $(icon) into SVG
    itemEl.innerHTML = parseCodiconLabel(item.label);
    return itemEl;
  }

  function addItem(item: StatusbarItem) {
    const itemEl = renderItem(item);
    itemEls.set(item.id, itemEl);
    (item.alignment === "right" ? dom.statusRight : dom.statusLeft).appendChild(itemEl);
  }

  on(StatusbarEvents.ItemRegister, (p) => addItem(p as StatusbarItem));

  on(StatusbarEvents.ItemUpdate, (p) => {
    const item = p as StatusbarItem;
    const existing = itemEls.get(item.id);
    if (!existing) return;
    existing.innerHTML = parseCodiconLabel(item.label);
    existing.title = item.tooltip ?? "";
    existing.style.display = item.visible !== false ? "inline-flex" : "none";
  });

  on(StatusbarEvents.ItemRemove, (p) => {
    const { id } = p as { id: string };
    itemEls.get(id)?.remove();
    itemEls.delete(id);
  });

  // Bootstrap from existing items
  if (apis.statusbar) {
    apis.statusbar.getItems("left").forEach(addItem);
    apis.statusbar.getItems("right").forEach(addItem);
  }
}
