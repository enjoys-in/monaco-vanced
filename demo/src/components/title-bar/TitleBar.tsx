// ── Title Bar — React menu bar + title ───────────────────────

import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../theme";
import {
  SidebarEvents, HeaderEvents, TitlebarEvents, PanelEvents,
  FileEvents, TabEvents, SettingsEvents, NotificationEvents,
} from "@enjoys/monaco-vanced/core/events";

// ── Types ────────────────────────────────────────────────────
export interface TitleBarProps {
  eventBus: { emit(ev: string, payload: unknown): void; on(ev: string, fn: (p: unknown) => void): void; off(ev: string, fn: (p: unknown) => void): void };
  commandApi?: { execute(id: string, ...args: unknown[]): void };
}

// ── Menu definitions ─────────────────────────────────────────
interface MenuItemDef { label: string; command?: string; keybinding?: string; separator?: boolean }
interface MenuDef { label: string; items: MenuItemDef[] }

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

// Header action button icons
const HEADER_BTNS = [
  { key: "commandPalette", title: "Command Palette (Ctrl+Shift+P)", svg: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M10.68 11.74a6 6 0 01-7.922-8.982 6 6 0 018.982 7.922l3.04 3.04a.749.749 0 01-.326 1.275.749.749 0 01-.734-.215l-3.04-3.04zM11.5 7a4.499 4.499 0 10-8.997 0A4.499 4.499 0 0011.5 7z"/></svg>` },
  { key: "togglePanel", title: "Toggle Panel (Ctrl+J)", svg: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1h12l.5.5v13l-.5.5H2l-.5-.5v-13L2 1zm0 1v4h12V2H2zm0 5v7h12V7H2z"/></svg>` },
  { key: "toggleSidebar", title: "Toggle Sidebar (Ctrl+B)", svg: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1h12l.5.5v13l-.5.5H2l-.5-.5v-13L2 1zm0 1v12h3V2H2zm4 0v12h8V2H6z"/></svg>` },
  { key: "openSettings", title: "Settings", svg: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M9.1 4.4L8.6 2H7.4l-.5 2.4-.7.3-2-1.3-.9.8 1.3 2-.3.7-2.4.5v1.2l2.4.5.3.7-1.3 2 .8.8 2-1.3.7.3.5 2.4h1.2l.5-2.4.7-.3 2 1.3.9-.8-1.3-2 .3-.7 2.4-.5V6.8l-2.4-.5-.3-.7 1.3-2-.8-.8-2 1.3-.7-.3zM9.4 1l.5 2.4L12 2.1l2 2-1.4 2.1 2.4.4v2.8l-2.4.5L14 12l-2 2-2.1-1.4-.5 2.4H6.6l-.5-2.4L4 14l-2-2 1.4-2.1L1 9.4V6.6l2.4-.5L2 4l2-2 2.1 1.4L6.6 1h2.8zM8 11a3 3 0 100-6 3 3 0 000 6zm0-1a2 2 0 110-4 2 2 0 010 4z"/></svg>` },
] as const;

// ── Menu Dropdown ────────────────────────────────────────────
function MenuDropdown({ menu, anchorRect, onClose, onCommand }: {
  menu: MenuDef; anchorRect: DOMRect; onClose: () => void;
  onCommand: (cmd: string) => void;
}) {
  const { tokens: t } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handler); };
  }, [onClose]);

  return createPortal(
    <div ref={ref} style={{
      position: "fixed", left: anchorRect.left, top: anchorRect.bottom,
      zIndex: 9999, background: t.menuBg, border: `1px solid ${t.borderLight}`,
      borderRadius: 6, padding: "4px 0", minWidth: 220,
      boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
    }}>
      {menu.items.map((mi, i) => mi.separator ? (
        <div key={i} style={{ height: 1, background: t.border, margin: "4px 0" }} />
      ) : (
        <MenuRow key={i} label={mi.label} keybinding={mi.keybinding} onClick={() => {
          onClose();
          if (mi.command) onCommand(mi.command);
        }} />
      ))}
    </div>,
    document.body,
  );
}

function MenuRow({ label, keybinding, onClick }: { label: string; keybinding?: string; onClick: () => void }) {
  const { tokens: t } = useTheme();
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", padding: "4px 24px 4px 12px",
        cursor: "pointer", fontSize: 13, color: t.fg, minHeight: 24,
        background: hovered ? t.listActive : "transparent",
      }}
    >
      <span style={{ flex: 1 }}>{label}</span>
      {keybinding && <span style={{ color: t.fgDim, fontSize: 12, marginLeft: 24 }}>{keybinding}</span>}
    </div>
  );
}

// ── Header Action Button ─────────────────────────────────────
function HeaderBtn({ title, svg, onClick }: { title: string; svg: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 28, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: hovered ? "var(--vsc-fg)" : "var(--vsc-fgDim)",
        borderRadius: 4, transition: "background .1s, color .1s",
        background: hovered ? "rgba(255,255,255,0.1)" : "transparent",
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// ── TitleBar Component ───────────────────────────────────────
export function TitleBar({ eventBus, commandApi }: TitleBarProps) {
  const { tokens: t } = useTheme();
  const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);
  const [titleLabel, setTitleLabel] = useState("Monaco Vanced");
  const [centerText, setCenterText] = useState("");

  const handleMenuCommand = useCallback((cmd: string) => {
    if (cmd.startsWith("sidebar.")) {
      eventBus.emit(SidebarEvents.ViewActivate, { viewId: cmd.split(".")[1] });
      return;
    }
    switch (cmd) {
      case "workbench.action.showCommands": eventBus.emit(HeaderEvents.CommandOpen, {}); break;
      case "workbench.action.toggleSidebar": eventBus.emit(SidebarEvents.Toggle, {}); break;
      case "workbench.action.togglePanel": eventBus.emit(PanelEvents.BottomToggle, {}); break;
      case "workbench.action.quickOpen": eventBus.emit(HeaderEvents.CommandOpen, {}); break;
      case "tab.close": eventBus.emit(TabEvents.CloseActive, {}); break;
      case "file.new":
        eventBus.emit(NotificationEvents.Show, { id: `notif-${Date.now()}`, type: "info", message: "New File: Use the Explorer toolbar to create files.", duration: 3000 });
        break;
      case "file.save":
        eventBus.emit(NotificationEvents.Show, { id: `notif-${Date.now()}`, type: "success", message: "File saved.", duration: 2000 });
        break;
      case "file.saveAll":
        eventBus.emit(NotificationEvents.Show, { id: `notif-${Date.now()}`, type: "success", message: "All files saved.", duration: 2000 });
        break;
      case "help.welcome":
        eventBus.emit(NotificationEvents.Show, { id: `notif-${Date.now()}`, type: "info", message: "Welcome to Monaco Vanced IDE", duration: 4000 });
        break;
      case "help.docs":
        eventBus.emit(NotificationEvents.Show, { id: `notif-${Date.now()}`, type: "info", message: "Documentation: https://github.com/AkashMondal/monaco-vanced", duration: 5000 });
        break;
      case "help.about":
        eventBus.emit(NotificationEvents.Show, { id: `notif-${Date.now()}`, type: "info", message: "Monaco Vanced v0.2.0 — Plugin-based IDE Architecture", duration: 4000 });
        break;
      case "debug.start": case "debug.run":
        eventBus.emit(NotificationEvents.Show, { id: `notif-${Date.now()}`, type: "info", message: "Debugging: Select a launch configuration first.", duration: 3000 });
        break;
      case "debug.stop":
        eventBus.emit(NotificationEvents.Show, { id: `notif-${Date.now()}`, type: "warning", message: "No active debug session.", duration: 2000 });
        break;
      case "terminal.new":
        eventBus.emit(PanelEvents.BottomToggle, {});
        break;
      default:
        if (commandApi) commandApi.execute(cmd);
        break;
    }
  }, [eventBus, commandApi]);

  const handleHeaderAction = useCallback((action: string) => {
    switch (action) {
      case "commandPalette": eventBus.emit(HeaderEvents.CommandOpen, {}); break;
      case "togglePanel": eventBus.emit(PanelEvents.BottomToggle, {}); break;
      case "toggleSidebar": eventBus.emit(SidebarEvents.Toggle, {}); break;
      case "openSettings": eventBus.emit(SettingsEvents.UIOpen, {}); break;
    }
  }, [eventBus]);

  // Listen for title updates
  useEffect(() => {
    const onUpdate = (p: unknown) => {
      const state = p as { fileName?: string; filePath?: string; isDirty?: boolean };
      const parts: string[] = [];
      if (state.fileName) parts.push(state.isDirty ? `● ${state.fileName}` : state.fileName);
      parts.push("— Monaco Vanced");
      const text = parts.join(" ");
      setCenterText(text);
      document.title = text;
    };
    const onTitleChange = (p: unknown) => {
      const { title } = p as { title: string };
      setTitleLabel(title);
    };
    eventBus.on(TitlebarEvents.Update, onUpdate);
    eventBus.on(HeaderEvents.TitleChange, onTitleChange);
    return () => {
      eventBus.off(TitlebarEvents.Update, onUpdate);
      eventBus.off(HeaderEvents.TitleChange, onTitleChange);
    };
  }, [eventBus]);

  return (
    <>
      {/* Menu bar */}
      <div className="vsc-title-menu" style={{
        display: "flex", alignItems: "center", gap: 0,
        WebkitAppRegion: "no-drag" as any, padding: "0 4px 0 8px",
      }}>
        {MENU_DEFS.map((menu, i) => (
          <div
            key={menu.label}
            style={{
              padding: "2px 8px", cursor: "pointer", fontSize: 12,
              color: t.fg, userSelect: "none", position: "relative",
            }}
            onClick={(e) => {
              if (openMenuIdx === i) { setOpenMenuIdx(null); setMenuAnchor(null); }
              else { setOpenMenuIdx(i); setMenuAnchor(e.currentTarget.getBoundingClientRect()); }
            }}
          >
            {menu.label}
          </div>
        ))}
      </div>

      {/* Title text */}
      <span className="vsc-title-text" style={{
        fontSize: 11, color: t.fgDim,
        WebkitAppRegion: "no-drag" as any, padding: "0 4px", whiteSpace: "nowrap",
      }}>
        {titleLabel}
      </span>

      {/* Center */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
        <span style={{ fontSize: 11, color: t.fgDim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {centerText}
        </span>
      </div>

      {/* Action buttons */}
      <div className="vsc-title-actions" style={{
        display: "flex", gap: 2, alignItems: "center",
        WebkitAppRegion: "no-drag" as any, paddingRight: 8,
      }}>
        {HEADER_BTNS.map((b) => (
          <HeaderBtn key={b.key} title={b.title} svg={b.svg} onClick={() => handleHeaderAction(b.key)} />
        ))}
      </div>

      {/* Dropdown portal */}
      {openMenuIdx !== null && menuAnchor && (
        <MenuDropdown
          menu={MENU_DEFS[openMenuIdx]}
          anchorRect={menuAnchor}
          onClose={() => { setOpenMenuIdx(null); setMenuAnchor(null); }}
          onCommand={handleMenuCommand}
        />
      )}
    </>
  );
}
