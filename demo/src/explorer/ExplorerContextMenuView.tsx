// ── Explorer Context Menu (React) — right-click actions ──────

import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "../components/theme";
import type { TreeNode } from "./ExplorerTypes";
import { ExplorerAction } from "@enjoys/monaco-vanced/core/events";

interface Props {
  x: number;
  y: number;
  node: TreeNode;
  onAction: (action: ExplorerAction, node: TreeNode) => void;
  onClose: () => void;
}

interface MenuOption {
  label: string;
  action: ExplorerAction;
  shortcut?: string;
  separator?: boolean;
}

/** File extensions that can be previewed */
const PREVIEWABLE = new Set([
  "md", "markdown", "mdown", "mkd",
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp",
  "mp4", "webm", "ogg", "mov",
  "mp3", "wav", "flac", "aac",
  "html", "htm",
  "pdf",
  "json",
  "csv",
]);

function isPreviewable(name: string): boolean {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return false;
  return PREVIEWABLE.has(name.slice(dot + 1).toLowerCase());
}

const FILE_MENU: MenuOption[] = [
  { label: "Open File", action: ExplorerAction.Open },
  { label: "Open to the Side", action: ExplorerAction.OpenSide, separator: true },
  { label: "Open in Integrated Terminal", action: ExplorerAction.OpenInTerminal },
  { label: "Add File to Chat", action: ExplorerAction.AddFileToChat, separator: true },
  { label: "Copy Path", action: ExplorerAction.CopyPath, shortcut: "Shift+Alt+C" },
  { label: "Copy Relative Path", action: ExplorerAction.CopyRelativePath, shortcut: "Shift+Alt+R" },
  { label: "Copy Content", action: ExplorerAction.CopyContent, separator: true },
  { label: "Rename…", action: ExplorerAction.Rename, shortcut: "F2" },
  { label: "Delete", action: ExplorerAction.Delete, shortcut: "Del" },
  { label: "Duplicate…", action: ExplorerAction.Duplicate },
];

const FOLDER_MENU: MenuOption[] = [
  { label: "New File…", action: ExplorerAction.NewFile },
  { label: "New Folder…", action: ExplorerAction.NewFolder, separator: true },
  { label: "Open in Integrated Terminal", action: ExplorerAction.OpenInTerminal },
  { label: "Add Folder to Chat", action: ExplorerAction.AddFolderToChat, separator: true },
  { label: "Copy Path", action: ExplorerAction.CopyPath, shortcut: "Shift+Alt+C" },
  { label: "Copy Relative Path", action: ExplorerAction.CopyRelativePath, separator: true },
  { label: "Rename…", action: ExplorerAction.Rename, shortcut: "F2" },
  { label: "Delete", action: ExplorerAction.Delete, shortcut: "Del", separator: true },
  { label: "Collapse Folder", action: ExplorerAction.CollapseFolder },
];

export function ExplorerContextMenuView({ x, y, node, onAction, onClose }: Props) {
  const { tokens: t } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const baseItems = node.isDirectory ? FOLDER_MENU : FILE_MENU;
  // Insert "Open Preview" after "Open to the Side" for previewable files
  const items = (!node.isDirectory && isPreviewable(node.name))
    ? [
        ...baseItems.slice(0, 2),
        { label: "Open Preview", action: ExplorerAction.Preview, shortcut: "Ctrl+Shift+V", separator: true },
        ...baseItems.slice(2),
      ]
    : baseItems;

  // Position adjustment
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8) el.style.left = `${window.innerWidth - rect.width - 8}px`;
    if (rect.bottom > window.innerHeight - 8) el.style.top = `${window.innerHeight - rect.height - 8}px`;
  }, [x, y]);

  // Close on outside click or Escape
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    requestAnimationFrame(() => {
      document.addEventListener("mousedown", onClick, { capture: true });
      document.addEventListener("keydown", onKey);
    });
    return () => {
      document.removeEventListener("mousedown", onClick, { capture: true });
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const handleClick = useCallback((action: ExplorerAction) => {
    onAction(action, node);
  }, [onAction, node]);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed", left: x, top: y, zIndex: 10000,
        background: t.menuBg, border: `1px solid ${t.borderLight}`, borderRadius: 6,
        boxShadow: "0 4px 16px rgba(0,0,0,.4)", padding: "4px 0", minWidth: 200,
        fontSize: 13, fontFamily: "inherit",
      }}
    >
      {items.map((item, i) => (
        <div key={item.action + i}>
          {item.separator && i > 0 && (
            <div style={{ height: 1, background: t.border, margin: "4px 8px" }} />
          )}
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "5px 12px", cursor: "pointer", color: t.fg, borderRadius: 3, margin: "0 4px",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.listActive; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            onClick={() => handleClick(item.action)}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span style={{ fontSize: 11, color: t.fgDim, marginLeft: 16 }}>{item.shortcut}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
