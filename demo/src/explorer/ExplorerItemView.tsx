// ── Explorer Item Views (React) — file, folder, inline input rows ──

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useTheme } from "../components/theme";
import type { TreeNode, ExplorerState } from "./ExplorerTypes";
import { getExtColor, getFolderColor } from "./ExplorerTypes";
import type { ExplorerIconAPI } from "./ExplorerView";
import { ExplorerTreeView } from "./ExplorerTreeView";

// ── SVG icons ────────────────────────────────────────────────

const chevronSvg = (
  <svg width="10" height="10" viewBox="0 0 16 16">
    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

function FolderOpenSvg({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill={color}>
      <path d="M1.5 14h13l.5-.5v-7l-.5-.5H8l-1-2H1.5L1 4.5v9l.5.5zM2 5h4.5l1 2H14v6H2V5z" />
    </svg>
  );
}

function FolderClosedSvg({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill={color}>
      <path d="M14.5 3H7.71l-.85-.85L6.51 2h-5l-.5.5v11l.5.5h13l.5-.5v-10L14.5 3zm-.51 8.49V13H2V3h4.29l.85.85.36.15h6.49v7.49z" />
    </svg>
  );
}

const SPECIAL_ICONS: Record<string, (color: string) => JSX.Element> = {
  ts: (c) => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill={c} /><text x="4" y="12" fontSize="8" fontWeight="bold" fill="white" fontFamily="sans-serif">TS</text></svg>,
  tsx: (c) => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill={c} /><text x="4" y="12" fontSize="8" fontWeight="bold" fill="white" fontFamily="sans-serif">TS</text></svg>,
  js: () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#f7df1e" /><text x="5" y="12" fontSize="8" fontWeight="bold" fill="#323330" fontFamily="sans-serif">JS</text></svg>,
  jsx: () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#f7df1e" /><text x="5" y="12" fontSize="8" fontWeight="bold" fill="#323330" fontFamily="sans-serif">JS</text></svg>,
  json: () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#292929" /><text x="2.5" y="11.5" fontSize="6.5" fill="#f7df1e" fontFamily="monospace">{"{}"}</text></svg>,
  css: () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#563d7c" /><text x="2" y="12" fontSize="7" fontWeight="bold" fill="white" fontFamily="sans-serif">#</text></svg>,
  scss: () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#563d7c" /><text x="2" y="12" fontSize="7" fontWeight="bold" fill="white" fontFamily="sans-serif">#</text></svg>,
  html: () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#e44d26" /><text x="2" y="12" fontSize="7" fontWeight="bold" fill="white" fontFamily="sans-serif">{"<>"}</text></svg>,
  md: () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#354a5f" /><text x="2" y="12" fontSize="8" fontWeight="bold" fill="white" fontFamily="sans-serif">M</text></svg>,
  py: () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#3572a5" /><text x="3.5" y="12" fontSize="8" fontWeight="bold" fill="#ffd43b" fontFamily="sans-serif">Py</text></svg>,
  go: () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#00add8" /><text x="3" y="12" fontSize="8" fontWeight="bold" fill="white" fontFamily="sans-serif">Go</text></svg>,
  rs: () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#dea584" /><text x="3" y="12" fontSize="8" fontWeight="bold" fill="#1e1e1e" fontFamily="sans-serif">Rs</text></svg>,
  java: () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#b07219" /><text x="3.5" y="12" fontSize="7" fontWeight="bold" fill="white" fontFamily="sans-serif">Jv</text></svg>,
  rb: () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#cc342d" /><text x="3" y="12" fontSize="8" fontWeight="bold" fill="white" fontFamily="sans-serif">Rb</text></svg>,
  lua: () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#000080" /><text x="2" y="12" fontSize="7" fontWeight="bold" fill="white" fontFamily="sans-serif">Lua</text></svg>,
  php: () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#4f5d95" /><text x="1.5" y="12" fontSize="6.5" fontWeight="bold" fill="white" fontFamily="sans-serif">PHP</text></svg>,
  c: (cc) => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill={cc} /><text x="5" y="12" fontSize="9" fontWeight="bold" fill="white" fontFamily="sans-serif">C</text></svg>,
  cpp: () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#f34b7d" /><text x="1.5" y="12" fontSize="6" fontWeight="bold" fill="white" fontFamily="sans-serif">C++</text></svg>,
  hpp: () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#f34b7d" /><text x="1.5" y="12" fontSize="6" fontWeight="bold" fill="white" fontFamily="sans-serif">C++</text></svg>,
  sql: () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#e38c00" /><text x="1.5" y="12" fontSize="6.5" fontWeight="bold" fill="white" fontFamily="sans-serif">SQL</text></svg>,
  sh: () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#89e051" /><text x="3.5" y="12" fontSize="7" fontWeight="bold" fill="#1e1e1e" fontFamily="sans-serif">Sh</text></svg>,
  yml: () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#cb171e" /><text x="1.5" y="12" fontSize="6.5" fontWeight="bold" fill="white" fontFamily="sans-serif">YML</text></svg>,
  yaml: () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#cb171e" /><text x="1.5" y="12" fontSize="6.5" fontWeight="bold" fill="white" fontFamily="sans-serif">YML</text></svg>,
};

function getExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** Map special filenames (no extension) → icon key in SPECIAL_ICONS or inline SVG */
const FILENAME_ICONS: Record<string, (color: string) => JSX.Element> = {
  dockerfile: (c) => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill={c} /><text x="1.5" y="11.5" fontSize="5.5" fontWeight="bold" fill="white" fontFamily="sans-serif">Dkr</text></svg>,
  makefile: (c) => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill={c} /><text x="1" y="12" fontSize="5.5" fontWeight="bold" fill="white" fontFamily="sans-serif">Mk</text></svg>,
  gemfile: () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#cc342d" /><text x="2" y="12" fontSize="7" fontWeight="bold" fill="white" fontFamily="sans-serif">Gm</text></svg>,
};

// ── Lazy Icon — uses icon API with lazy loading ─────────────

function LazyIcon({ src }: { src: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setLoaded(true); obs.disconnect(); } },
      { rootMargin: "100px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <span ref={ref} style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, marginRight: 6 }}>
      {loaded ? (
        <img src={src} width={16} height={16} style={{ display: "block" }} alt="" loading="lazy" />
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" opacity=".2" strokeWidth="1" />
        </svg>
      )}
    </span>
  );
}

// ── Fallback file icon SVG ──────────────────────────────────

function FileIconSvg({ ext, filename }: { ext: string; filename?: string }) {
  // Check filename-based icons for extensionless files (Dockerfile, Makefile, etc.)
  if (!ext && filename) {
    const key = filename.toLowerCase();
    const fnIcon = FILENAME_ICONS[key];
    if (fnIcon) {
      const color = getExtColor(key) || "#6a737d";
      return <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, marginRight: 6 }}>{fnIcon(color)}</span>;
    }
  }
  const color = getExtColor(ext);
  const special = SPECIAL_ICONS[ext];
  if (special) return <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, marginRight: 6 }}>{special(color)}</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, marginRight: 6 }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 1h6.5L13 4.5V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z" stroke={color} strokeWidth="1" fill="none" />
        <path d="M9.5 1v3.5H13" stroke={color} strokeWidth="1" fill="none" />
        <text x="4" y="12" fontSize="5" fill={color} fontFamily="monospace">{ext.slice(0, 3)}</text>
      </svg>
    </span>
  );
}

// ── File Item ────────────────────────────────────────────────

interface FileItemProps {
  node: TreeNode;
  depth: number;
  isActive: boolean;
  isOpen: boolean;
  isModified: boolean;
  isRenaming: boolean;
  iconApi?: ExplorerIconAPI;
  onFileClick: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
  onRenameConfirm: (name: string) => void;
  onRenameCancel: () => void;
}

export const ExplorerFileItem = memo(function ExplorerFileItem({
  node, depth, isActive, isOpen, isModified, isRenaming,
  iconApi, onFileClick, onContextMenu, onRenameConfirm, onRenameCancel,
}: FileItemProps) {
  const { tokens: t } = useTheme();
  const renameRef = useRef<HTMLInputElement>(null);
  const ext = getExt(node.name);

  useEffect(() => {
    if (isRenaming && renameRef.current) {
      renameRef.current.focus();
      const dot = renameRef.current.value.lastIndexOf(".");
      renameRef.current.setSelectionRange(0, dot >= 0 ? dot : renameRef.current.value.length);
    }
  }, [isRenaming]);

  const icon = iconApi
    ? <LazyIcon src={iconApi.getFileIcon(node.name, false, false)} />
    : <FileIconSvg ext={ext} filename={node.name} />;

  if (isRenaming) {
    return (
      <div
        className="vsc-file-item explorer-item"
        style={{ display: "flex", alignItems: "center", height: 22, paddingLeft: 24 + depth * 16, paddingRight: 8, cursor: "pointer", userSelect: "none", position: "relative" }}
      >
        {icon}
        <input
          ref={renameRef}
          type="text"
          defaultValue={node.name}
          className="explorer-inline-input"
          style={{ flex: 1, height: 18, fontSize: 12, padding: "0 4px", background: t.inputBg, color: t.fg, border: `1px solid ${t.focusBorder}`, borderRadius: 2, outline: "none", fontFamily: "inherit", minWidth: 0 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); onRenameConfirm((e.target as HTMLInputElement).value); }
            else if (e.key === "Escape") { e.preventDefault(); onRenameCancel(); }
          }}
          onBlur={() => onRenameCancel()}
        />
      </div>
    );
  }

  return (
    <div
      className="vsc-file-item explorer-item"
      data-uri={node.path}
      data-active={isActive ? "true" : "false"}
      style={{ display: "flex", alignItems: "center", height: 22, paddingLeft: 24 + depth * 16, paddingRight: 8, cursor: "pointer", userSelect: "none", position: "relative" }}
      onClick={(e) => { e.stopPropagation(); onFileClick(node.path); }}
      onContextMenu={(e) => onContextMenu(e, node)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", node.path);
        e.dataTransfer.setData("application/x-monaco-path", node.path);
        e.dataTransfer.effectAllowed = "copyMove";
      }}
    >
      {icon}
      <span style={{ color: t.fg, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
        {node.name}
      </span>
      {isModified && (
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.warningYellow, marginLeft: "auto", flexShrink: 0 }} title="Modified" />
      )}
      {!isModified && isOpen && (
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: t.accent, marginLeft: "auto", flexShrink: 0, opacity: 0.6 }} title="Open in editor" />
      )}
    </div>
  );
});

// ── Folder Item ──────────────────────────────────────────────

interface FolderItemProps {
  node: TreeNode;
  depth: number;
  state: ExplorerState;
  iconApi?: ExplorerIconAPI;
  onFolderToggle: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
  onFileClick: (path: string) => void;
  onRenameConfirm: (name: string) => void;
  onRenameCancel: () => void;
  onInlineConfirm: (name: string) => void;
  onInlineCancel: () => void;
}

export const ExplorerFolderItem = memo(function ExplorerFolderItem({
  node, depth, state, iconApi,
  onFolderToggle, onContextMenu, onFileClick,
  onRenameConfirm, onRenameCancel, onInlineConfirm, onInlineCancel,
}: FolderItemProps) {
  const { tokens: t } = useTheme();
  const isExpanded = node.expanded ?? false;
  const folderColor = getFolderColor(node.name);

  const folderIcon = iconApi
    ? <LazyIcon src={iconApi.getFileIcon(node.name, true, isExpanded)} />
    : (isExpanded ? <FolderOpenSvg color={folderColor} /> : <FolderClosedSvg color={folderColor} />);

  return (
    <>
      <div
        className="vsc-file-item explorer-item"
        data-path={node.path}
        style={{ display: "flex", alignItems: "center", height: 22, paddingLeft: 8 + depth * 16, paddingRight: 8, cursor: "pointer", userSelect: "none" }}
        onClick={(e) => { e.stopPropagation(); onFolderToggle(node.path); }}
        onContextMenu={(e) => onContextMenu(e, node)}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", node.path);
          e.dataTransfer.setData("application/x-monaco-path", node.path);
          e.dataTransfer.effectAllowed = "copyMove";
        }}
      >
        {/* Chevron */}
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 16, height: 16, transition: "transform .12s ease",
          transform: `rotate(${isExpanded ? 90 : 0}deg)`, color: t.fgDim, flexShrink: 0,
        }}>
          {chevronSvg}
        </span>

        {/* Folder icon */}
        <span style={{ marginRight: 4, display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
          {folderIcon}
        </span>

        {/* Label */}
        <span style={{ color: t.fg, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {node.name}
        </span>
      </div>

      {/* Children */}
      {isExpanded && (
        <ExplorerTreeView
          nodes={node.children ?? []}
          state={state}
          depth={depth + 1}
          parentPath={node.path}
          iconApi={iconApi}
          onFileClick={onFileClick}
          onFolderToggle={onFolderToggle}
          onContextMenu={onContextMenu}
          onRenameConfirm={onRenameConfirm}
          onRenameCancel={onRenameCancel}
          onInlineConfirm={onInlineConfirm}
          onInlineCancel={onInlineCancel}
        />
      )}
    </>
  );
});

// ── Inline Input (New File / New Folder) ─────────────────────

interface InlineInputProps {
  type: "file" | "folder";
  depth: number;
  iconApi?: ExplorerIconAPI;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function ExplorerInlineInput({ type, depth, iconApi, onConfirm, onCancel }: InlineInputProps) {
  const { tokens: t } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const ext = getExt(value);
  const paddingLeft = type === "folder" ? 8 + depth * 16 : 24 + depth * 16;

  return (
    <div
      className="explorer-item explorer-inline-row"
      style={{ display: "flex", alignItems: "center", height: 22, paddingLeft, paddingRight: 8 }}
    >
      {type === "folder" ? (
        <>
          <span style={{ width: 16 }} />
          <span style={{ marginRight: 4, display: "inline-flex", alignItems: "center" }}>
            <FolderClosedSvg color="#dcb67a" />
          </span>
        </>
      ) : (
        <span style={{ marginRight: 6, display: "inline-flex", alignItems: "center" }}>
          {iconApi && value ? (
            <LazyIcon src={iconApi.getFileIcon(value, false, false)} />
          ) : (
            <FileIconSvg ext={ext} />
          )}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        className="explorer-inline-input"
        placeholder={type === "folder" ? "Folder name…" : "File name…"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ flex: 1, height: 18, fontSize: 12, padding: "0 4px", background: t.inputBg, color: t.fg, border: `1px solid ${t.focusBorder}`, borderRadius: 2, outline: "none", fontFamily: "inherit", minWidth: 0 }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); value.trim() ? onConfirm(value.trim()) : onCancel(); }
          else if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        }}
        onBlur={() => setTimeout(() => onCancel(), 100)}
      />
    </div>
  );
}
