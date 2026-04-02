// ── Explorer Context Menu — right-click actions ─────────────
// Reusable, positioned near cursor, closes on outside click.
// Uses theme colors from wireframe types + ExplorerAction enum.

import type { TreeNode } from "./ExplorerTypes";
import { ExplorerAction } from "@enjoys/monaco-vanced/core/events";
import { C } from "../wireframe/types";

interface MenuOption {
  label: string;
  icon: string;
  action: ExplorerAction;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
}

export type ContextMenuHandler = (action: ExplorerAction, node: TreeNode) => void;

const FILE_MENU: MenuOption[] = [
  { label: "Open File", icon: openIcon(), action: ExplorerAction.Open },
  { label: "Open to the Side", icon: splitIcon(), action: ExplorerAction.OpenSide, separator: true },
  { label: "Open in Integrated Terminal", icon: terminalIcon(), action: ExplorerAction.OpenInTerminal, separator: true },
  { label: "Copy Path", icon: copyIcon(), action: ExplorerAction.CopyPath, shortcut: "Shift+Alt+C" },
  { label: "Copy Relative Path", icon: copyIcon(), action: ExplorerAction.CopyRelativePath, shortcut: "Shift+Alt+R" },
  { label: "Copy Content", icon: copyIcon(), action: ExplorerAction.CopyContent, separator: true },
  { label: "Rename…", icon: renameIcon(), action: ExplorerAction.Rename, shortcut: "F2" },
  { label: "Delete", icon: deleteIcon(), action: ExplorerAction.Delete, shortcut: "Del" },
  { label: "Duplicate…", icon: duplicateIcon(), action: ExplorerAction.Duplicate },
];

const FOLDER_MENU: MenuOption[] = [
  { label: "New File…", icon: newFileIcon(), action: ExplorerAction.NewFile },
  { label: "New Folder…", icon: newFolderIcon(), action: ExplorerAction.NewFolder, separator: true },
  { label: "Open in Integrated Terminal", icon: terminalIcon(), action: ExplorerAction.OpenInTerminal, separator: true },
  { label: "Copy Path", icon: copyIcon(), action: ExplorerAction.CopyPath, shortcut: "Shift+Alt+C" },
  { label: "Copy Relative Path", icon: copyIcon(), action: ExplorerAction.CopyRelativePath, separator: true },
  { label: "Rename…", icon: renameIcon(), action: ExplorerAction.Rename, shortcut: "F2" },
  { label: "Delete", icon: deleteIcon(), action: ExplorerAction.Delete, shortcut: "Del", separator: true },
  { label: "Collapse Folder", icon: collapseIcon(), action: ExplorerAction.CollapseFolder },
];

export class ExplorerContextMenu {
  private el: HTMLElement;
  private currentNode: TreeNode | null = null;
  private handler: ContextMenuHandler | null = null;
  private closeListener: ((e: MouseEvent) => void) | null = null;
  private keyListener: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    this.el = document.createElement("div");
    this.el.className = "explorer-context-menu";
    this.el.style.cssText = `
      position:fixed;z-index:10000;display:none;
      background:${C.menuBg};border:1px solid ${C.borderLight};border-radius:6px;
      box-shadow:0 4px 16px rgba(0,0,0,.4);padding:4px 0;min-width:200px;
      font-size:13px;font-family:inherit;
    `;
    document.body.appendChild(this.el);
  }

  setHandler(handler: ContextMenuHandler): void {
    this.handler = handler;
  }

  show(e: MouseEvent, node: TreeNode): void {
    this.currentNode = node;
    this.el.innerHTML = "";

    const items = node.isDirectory ? FOLDER_MENU : FILE_MENU;
    for (const item of items) {
      if (item.separator) {
        this.el.appendChild(this.createSeparator());
      }
      this.el.appendChild(this.createItem(item));
    }

    // Position
    this.el.style.display = "block";
    const rect = this.el.getBoundingClientRect();
    const x = Math.min(e.clientX, window.innerWidth - rect.width - 8);
    const y = Math.min(e.clientY, window.innerHeight - rect.height - 8);
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;

    // Close on outside click / Escape
    requestAnimationFrame(() => {
      this.closeListener = (ev: MouseEvent) => {
        if (!this.el.contains(ev.target as Node)) this.hide();
      };
      this.keyListener = (ev: KeyboardEvent) => {
        if (ev.key === "Escape") this.hide();
      };
      document.addEventListener("mousedown", this.closeListener, { capture: true });
      document.addEventListener("keydown", this.keyListener);
    });
  }

  hide(): void {
    this.el.style.display = "none";
    this.el.innerHTML = "";
    this.currentNode = null;
    if (this.closeListener) {
      document.removeEventListener("mousedown", this.closeListener, { capture: true });
      this.closeListener = null;
    }
    if (this.keyListener) {
      document.removeEventListener("keydown", this.keyListener);
      this.keyListener = null;
    }
  }

  private createItem(option: MenuOption): HTMLElement {
    const row = document.createElement("div");
    row.className = "explorer-ctx-item";
    row.style.cssText = `display:flex;align-items:center;gap:8px;padding:4px 12px;cursor:pointer;color:${option.disabled ? C.fgDim : C.fg};border-radius:3px;margin:0 4px;`;

    const iconSpan = `<span style="display:inline-flex;align-items:center;color:${C.fgDim};width:16px;height:16px;">${option.icon}</span>`;
    const labelSpan = `<span style="flex:1;">${option.label}</span>`;
    const shortcutSpan = option.shortcut ? `<span style="color:${C.fgDim};font-size:11px;margin-left:auto;">${option.shortcut}</span>` : "";
    row.innerHTML = `${iconSpan}${labelSpan}${shortcutSpan}`;

    if (!option.disabled) {
      row.addEventListener("mouseenter", () => { row.style.background = C.listHover; row.style.color = C.fgBright; });
      row.addEventListener("mouseleave", () => { row.style.background = "transparent"; row.style.color = C.fg; });
      row.addEventListener("click", (e) => {
        e.stopPropagation();
        const node = this.currentNode;
        const handler = this.handler;
        this.hide();
        if (node && handler) {
          handler(option.action, node);
        }
      });
    }

    return row;
  }

  private createSeparator(): HTMLElement {
    const sep = document.createElement("div");
    sep.style.cssText = `height:1px;background:${C.borderLight};margin:4px 8px;`;
    return sep;
  }

  dispose(): void {
    this.hide();
    this.el.remove();
  }
}

// ── Icon SVGs ───────────────────────────────────────────────

function openIcon(): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 1h6.5L13 4.5V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z"/></svg>`;
}

function splitIcon(): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2h6v12H1V2zm8 0h6v12H9V2z"/></svg>`;
}

function newFileIcon(): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M12 3H8.5L7 1.5 6.5 1H2l-.5.5v12l.5.5h10l.5-.5V3.5L12 3zm-.5 9.5h-9v-11H6v2.5l.5.5H11.5v8zM7 3.5V2l3.5 3.5H8L7.5 5V3.5z"/></svg>`;
}

function newFolderIcon(): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M14 4H9l-1-2H2L1 3v10l1 1h12l1-1V5l-1-1zm0 9H2V3h5.5l1 2H14v8z"/></svg>`;
}

function renameIcon(): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.23.71a1 1 0 00-1.42 0L3 9.5V13h3.5l8.8-8.8a1 1 0 000-1.42l-2.07-2.07zM5.79 12H4v-1.79l7.4-7.4 1.79 1.79-7.4 7.4z"/></svg>`;
}

function deleteIcon(): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M10 3h3v1H3V3h3l1-1h2l1 1zM4 5v8c0 .6.4 1 1 1h6c.6 0 1-.4 1-1V5H4zm2 7V7h1v5H6zm3 0V7h1v5H9z"/></svg>`;
}

function copyIcon(): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 4h8v8H4V4zm1 1v6h6V5H5zM2 2h8v1H3v7H2V2z"/></svg>`;
}

function collapseIcon(): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M9 9H4v1h5V9zM9 4H4v1h5V4z"/><path d="M1 2.5l.5-.5h12l.5.5v10l-.5.5h-12l-.5-.5v-10zm1 0v10h12v-10H2z"/></svg>`;
}

function duplicateIcon(): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 4h8v8H4V4zm1 1v6h6V5H5zM2 2h8v1H3v7H2V2z"/></svg>`;
}

function terminalIcon(): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 3.5l.5-.5h13l.5.5v9l-.5.5h-13l-.5-.5v-9zM2 12h12V4H2v8zm6.146-3.146l-2-2 .708-.708L9.207 8.5l-2.353 2.354-.708-.708 2-2z"/></svg>`;
}
