// ── Individual Tab — icon, label, dirty dot, close button ────

import { useState, useCallback, type MouseEvent as RME } from "react";
import { useTheme } from "../theme";
import { fileIconSvg, getExt, langColor } from "../../wireframe/utils";
import type { ExplorerIconAPI } from "../../explorer";

export interface TabProps {
  uri: string;
  label: string;
  isActive: boolean;
  isDirty: boolean;
  isPinned: boolean;
  isSpecial?: boolean;
  isDeleted?: boolean;
  iconApi?: ExplorerIconAPI;
  onClick: () => void;
  onClose: () => void;
  onContextMenu: (x: number, y: number) => void;
  onDragStart: (uri: string) => void;
  onDragOver: (uri: string) => void;
  onDragEnd: () => void;
  dragOverUri?: string | null;
}

export function Tab({
  uri, label, isActive, isDirty, isPinned, isSpecial, isDeleted,
  iconApi, onClick, onClose, onContextMenu,
  onDragStart, onDragOver, onDragEnd, dragOverUri,
}: TabProps) {
  const { tokens: t } = useTheme();
  const [hovered, setHovered] = useState(false);

  const handleCtx = useCallback((e: RME) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e.clientX, e.clientY);
  }, [onContextMenu]);

  const handleAux = useCallback((e: RME) => {
    if (e.button === 1) { e.preventDefault(); onClose(); }
  }, [onClose]);

  const showClose = hovered || isActive;
  const showDirtyDot = isDirty && !hovered;
  const isDragTarget = dragOverUri === uri;

  return (
    <div
      draggable
      onClick={onClick}
      onContextMenu={handleCtx}
      onAuxClick={handleAux}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", uri); onDragStart(uri); }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; onDragOver(uri); }}
      onDragEnd={onDragEnd}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "0 4px 0 12px", height: "100%", cursor: "grab",
        borderRight: `1px solid ${t.border}`, fontSize: 13,
        whiteSpace: "nowrap", minWidth: 0, position: "relative",
        background: isActive ? t.tabActiveBg : hovered ? t.hover : t.tabInactiveBg,
        color: isActive ? t.fgBright : t.fgDim,
        borderTop: isActive ? `2px solid ${t.accent}` : "2px solid transparent",
        borderBottom: isActive ? `1px solid ${t.tabActiveBg}` : "1px solid transparent",
        borderLeft: isDragTarget ? `2px solid ${t.accent}` : "2px solid transparent",
        transition: "background .1s", userSelect: "none",
      }}
    >
      <FileIcon label={label} isSpecial={isSpecial} iconApi={iconApi} />
      <span style={{
        overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120,
        fontStyle: isDirty || isPinned ? "italic" : "normal",
        textDecoration: isDeleted ? "line-through" : "none",
        color: isDeleted ? t.errorRed : undefined,
        opacity: isDeleted ? 0.7 : 1,
      }}>
        {label}
      </span>
      <span style={{
        width: 20, height: 20, display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0, marginLeft: "auto",
      }}>
        {showClose && <CloseBtn color={isDirty ? t.fg : t.fgDim} onClick={(e) => { e.stopPropagation(); onClose(); }} />}
        {showDirtyDot && <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.fg }} />}
      </span>
    </div>
  );
}

// ── File Icon — uses iconApi with SVG fallback ───────────────

function FileIcon({ label, isSpecial, iconApi }: { label: string; isSpecial?: boolean; iconApi?: ExplorerIconAPI }) {
  const { tokens: t } = useTheme();
  const [imgFailed, setImgFailed] = useState(false);

  if (isSpecial) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, color: t.fgDim }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M9.1 4.4L8.6 2H7.4l-.5 2.4-.7.3-2-1.3-.9.8 1.3 2-.3.7-2.4.5v1.2l2.4.5.3.7-1.3 2 .8.8 2-1.3.7.3.5 2.4h1.2l.5-2.4.7-.3 2 1.3.9-.8-1.3-2 .3-.7 2.4-.5V6.8l-2.4-.5-.3-.7 1.3-2-.8-.8-2 1.3-.7-.3zM8 10a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </span>
    );
  }

  const ext = getExt(label);
  const color = langColor(ext);

  if (iconApi && !imgFailed) {
    const url = iconApi.getFileIcon(label);
    if (url) {
      return (
        <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
          <img src={url} width={16} height={16} style={{ display: "block" }} onError={() => setImgFailed(true)} alt="" />
        </span>
      );
    }
  }

  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, color }}
      dangerouslySetInnerHTML={{ __html: fileIconSvg(ext) }}
    />
  );
}

// ── Close Button ─────────────────────────────────────────────

function CloseBtn({ color, onClick }: { color: string; onClick: (e: RME) => void }) {
  const [hover, setHover] = useState(false);
  return (
    <span
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        cursor: "pointer", borderRadius: 3, display: "flex",
        alignItems: "center", justifyContent: "center",
        width: 18, height: 18, color,
        background: hover ? "rgba(255,255,255,0.1)" : "transparent",
        transition: "background .1s",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 16 16">
        <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z" fill="currentColor" />
      </svg>
    </span>
  );
}
