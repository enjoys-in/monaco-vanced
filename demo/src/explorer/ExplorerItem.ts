// ── Explorer Item — renders a single file or folder row ──────
// Stateless component: receives data, returns DOM element.

import type { TreeNode } from "./ExplorerTypes";
import { getExtColor, getFolderColor } from "./ExplorerTypes";

const C = {
  fg: "#cccccc",
  fgDim: "#858585",
  fgBright: "#e0e0e0",
  accent: "#007acc",
  listHover: "rgba(255,255,255,0.04)",
  listActive: "rgba(255,255,255,0.08)",
  inputBg: "#3c3c3c",
  inputBorder: "#3c3c3c",
  focusBorder: "#007fd4",
  modifiedDot: "#e2c08d",
  openDot: "#007acc",
};

// ── SVG icon builders ───────────────────────────────────────

function chevronSvg(): string {
  return `<svg width="10" height="10" viewBox="0 0 16 16"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
}

function folderOpenSvg(color: string): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="${color}"><path d="M1.5 14h13l.5-.5v-7l-.5-.5H8l-1-2H1.5L1 4.5v9l.5.5zM2 5h4.5l1 2H14v6H2V5z"/></svg>`;
}

function folderClosedSvg(color: string): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="${color}"><path d="M14.5 3H7.71l-.85-.85L6.51 2h-5l-.5.5v11l.5.5h13l.5-.5v-10L14.5 3zm-.51 8.49V13H2V3h4.29l.85.85.36.15h6.49v7.49z"/></svg>`;
}

function fileIconSvg(ext: string): string {
  const color = getExtColor(ext);
  // Extension-specific icons
  const special = getSpecialFileIcon(ext);
  if (special) return special;
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 1h6.5L13 4.5V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z" stroke="${color}" stroke-width="1" fill="none"/><path d="M9.5 1v3.5H13" stroke="${color}" stroke-width="1" fill="none"/><text x="4" y="12" font-size="5" fill="${color}" font-family="monospace">${ext.slice(0, 3)}</text></svg>`;
}

function getSpecialFileIcon(ext: string): string | null {
  switch (ext) {
    case "ts":
    case "tsx":
      return `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#3178c6"/><text x="4" y="12" font-size="8" font-weight="bold" fill="white" font-family="sans-serif">TS</text></svg>`;
    case "js":
    case "jsx":
      return `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#f7df1e"/><text x="5" y="12" font-size="8" font-weight="bold" fill="#323330" font-family="sans-serif">JS</text></svg>`;
    case "json":
      return `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#292929"/><text x="2.5" y="11.5" font-size="6.5" fill="#f7df1e" font-family="monospace">{}</text></svg>`;
    case "css":
    case "scss":
    case "less":
      return `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#563d7c"/><text x="2" y="12" font-size="7" font-weight="bold" fill="white" font-family="sans-serif">#</text></svg>`;
    case "html":
    case "htm":
      return `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#e44d26"/><text x="2" y="12" font-size="7" font-weight="bold" fill="white" font-family="sans-serif">&lt;&gt;</text></svg>`;
    case "md":
    case "mdx":
      return `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#354a5f"/><text x="2" y="12" font-size="8" font-weight="bold" fill="white" font-family="sans-serif">M</text></svg>`;
    case "svg":
      return `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#ffb13b"/><text x="1.5" y="11" font-size="5.5" font-weight="bold" fill="white" font-family="sans-serif">SVG</text></svg>`;
    case "py":
      return `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#3572a5"/><text x="3.5" y="12" font-size="8" font-weight="bold" fill="#ffd43b" font-family="sans-serif">Py</text></svg>`;
    case "yml":
    case "yaml":
      return `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#cb171e"/><text x="2.5" y="11.5" font-size="6" font-weight="bold" fill="white" font-family="sans-serif">yml</text></svg>`;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "ico":
      return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" stroke="#a074c4" fill="none"/><circle cx="5.5" cy="5.5" r="1.5" fill="#a074c4"/><path d="M1.5 11l3.5-4 3 3 2-1.5L14.5 13" stroke="#a074c4" stroke-width="1" fill="none"/></svg>`;
    default:
      return null;
  }
}

function getExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

// ── Element factory ─────────────────────────────────────────

function el(tag: string, attrs: Record<string, string> = {}, text?: string): HTMLElement {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "style") e.style.cssText = v;
    else if (k === "class") e.className = v;
    else e.setAttribute(k, v);
  }
  if (text) e.textContent = text;
  return e;
}

// ── Callbacks interface ─────────────────────────────────────

export interface ExplorerItemCallbacks {
  onFileClick: (path: string) => void;
  onFolderToggle: (path: string) => void;
  onContextMenu: (e: MouseEvent, node: TreeNode) => void;
  onRenameConfirm: (newName: string) => void;
  onRenameCancel: () => void;
  onInlineConfirm?: (name: string) => void;
  onInlineCancel?: () => void;
}

// ── Render File Row ─────────────────────────────────────────

export function renderFileItem(
  node: TreeNode,
  depth: number,
  isActive: boolean,
  isOpen: boolean,
  isModified: boolean,
  isRenaming: boolean,
  callbacks: ExplorerItemCallbacks,
): HTMLElement {
  const ext = getExt(node.name);
  const row = el("div", {
    class: "vsc-file-item explorer-item",
    "data-uri": node.path,
    "data-active": isActive ? "true" : "false",
    style: `display:flex;align-items:center;height:22px;padding-left:${24 + depth * 16}px;padding-right:8px;cursor:pointer;user-select:none;position:relative;`,
  });

  // Icon
  const icon = el("span", { style: "margin-right:6px;display:inline-flex;align-items:center;flex-shrink:0;" });
  icon.innerHTML = fileIconSvg(ext);

  if (isRenaming) {
    // Inline rename input
    const input = document.createElement("input");
    input.type = "text";
    input.value = node.name;
    input.className = "explorer-inline-input";
    input.style.cssText = `flex:1;height:18px;font-size:12px;padding:0 4px;background:${C.inputBg};color:${C.fg};border:1px solid ${C.focusBorder};border-radius:2px;outline:none;font-family:inherit;min-width:0;`;
    row.append(icon, input);

    requestAnimationFrame(() => {
      input.focus();
      const dotIndex = input.value.lastIndexOf(".");
      input.setSelectionRange(0, dotIndex >= 0 ? dotIndex : input.value.length);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); callbacks.onRenameConfirm(input.value); }
      else if (e.key === "Escape") { e.preventDefault(); callbacks.onRenameCancel(); }
    });
    input.addEventListener("blur", () => callbacks.onRenameCancel());
  } else {
    // Normal label
    const label = el("span", { style: `color:${C.fg};font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;` }, node.name);
    row.append(icon, label);

    // Status indicators
    if (isModified) {
      const dot = el("span", { style: `width:6px;height:6px;border-radius:50%;background:${C.modifiedDot};margin-left:auto;flex-shrink:0;`, title: "Modified" });
      row.appendChild(dot);
    } else if (isOpen) {
      const dot = el("span", { style: `width:5px;height:5px;border-radius:50%;background:${C.openDot};margin-left:auto;flex-shrink:0;opacity:.6;`, title: "Open in editor" });
      row.appendChild(dot);
    }

    row.addEventListener("click", (e) => { e.stopPropagation(); callbacks.onFileClick(node.path); });
    row.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); callbacks.onContextMenu(e, node); });
  }

  return row;
}

// ── Render Folder Row ───────────────────────────────────────

export function renderFolderItem(
  node: TreeNode,
  depth: number,
  callbacks: ExplorerItemCallbacks,
): { header: HTMLElement; childContainer: HTMLElement } {
  const folderColor = getFolderColor(node.name);
  const isExpanded = node.expanded ?? false;

  const header = el("div", {
    class: "vsc-file-item explorer-item",
    "data-path": node.path,
    style: `display:flex;align-items:center;height:22px;padding-left:${8 + depth * 16}px;padding-right:8px;cursor:pointer;user-select:none;`,
  });

  // Chevron
  const chevron = el("span", {
    style: `display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;transition:transform .12s ease;transform:rotate(${isExpanded ? "90deg" : "0"});color:${C.fgDim};flex-shrink:0;`,
  });
  chevron.innerHTML = chevronSvg();

  // Folder icon
  const folderIcon = el("span", { style: `margin-right:4px;display:inline-flex;align-items:center;flex-shrink:0;` });
  folderIcon.innerHTML = isExpanded ? folderOpenSvg(folderColor) : folderClosedSvg(folderColor);

  // Label
  const label = el("span", { style: `color:${C.fg};font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;` }, node.name);

  header.append(chevron, folderIcon, label);

  // Children container
  const childContainer = el("div", { style: isExpanded ? "" : "display:none;" });

  // Click toggles expand/collapse
  header.addEventListener("click", (e) => {
    e.stopPropagation();
    callbacks.onFolderToggle(node.path);
    const expanded = !isExpanded;
    chevron.style.transform = `rotate(${expanded ? "90deg" : "0"})`;
    folderIcon.innerHTML = expanded ? folderOpenSvg(folderColor) : folderClosedSvg(folderColor);
    childContainer.style.display = expanded ? "" : "none";
  });

  header.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    callbacks.onContextMenu(e, node);
  });

  return { header, childContainer };
}

// ── Inline Input Row (new file / new folder) ────────────────

export function renderInlineInput(
  type: "file" | "folder",
  depth: number,
  onConfirm: (name: string) => void,
  onCancel: () => void,
): HTMLElement {
  const row = el("div", {
    class: "explorer-item explorer-inline-row",
    style: `display:flex;align-items:center;height:22px;padding-left:${type === "folder" ? 8 + depth * 16 : 24 + depth * 16}px;padding-right:8px;`,
  });

  // Icon hint
  const icon = el("span", { style: "margin-right:6px;display:inline-flex;align-items:center;flex-shrink:0;" });
  if (type === "folder") {
    const spacer = el("span", { style: "width:16px;" }); // chevron space
    icon.innerHTML = folderClosedSvg("#dcb67a");
    row.append(spacer, icon);
  } else {
    icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 1h6.5L13 4.5V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z" stroke="#858585" stroke-width="1" fill="none"/><path d="M9.5 1v3.5H13" stroke="#858585" stroke-width="1" fill="none"/></svg>`;
    row.append(icon);
  }

  const input = document.createElement("input");
  input.type = "text";
  input.className = "explorer-inline-input";
  input.placeholder = type === "folder" ? "Folder name…" : "File name…";
  input.style.cssText = `flex:1;height:18px;font-size:12px;padding:0 4px;background:${C.inputBg};color:${C.fg};border:1px solid ${C.focusBorder};border-radius:2px;outline:none;font-family:inherit;min-width:0;`;

  row.appendChild(input);

  requestAnimationFrame(() => input.focus());

  // Update icon color as user types (for files)
  if (type === "file") {
    input.addEventListener("input", () => {
      const ext = getExt(input.value);
      icon.innerHTML = fileIconSvg(ext || "");
    });
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); if (input.value.trim()) onConfirm(input.value.trim()); else onCancel(); }
    else if (e.key === "Escape") { e.preventDefault(); onCancel(); }
  });
  input.addEventListener("blur", () => {
    // Small delay to allow click events to fire first
    setTimeout(() => onCancel(), 100);
  });

  return row;
}
