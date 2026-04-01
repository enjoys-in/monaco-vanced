// ── Tab Context Menu — portal overlay with click-outside dismiss ──

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../theme";

export interface MenuItemDef {
  label?: string;
  shortcut?: string;
  type?: "separator";
  disabled?: boolean;
  action?: () => void;
}

interface Props {
  x: number;
  y: number;
  items: MenuItemDef[];
  onClose: () => void;
}

export function TabContextMenu({ x, y, items, onClose }: Props) {
  const { tokens: t } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  // Click-outside dismiss
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    requestAnimationFrame(() => document.addEventListener("mousedown", handler));
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Escape dismiss
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Viewport clamp
  const maxX = window.innerWidth - 240;
  const maxY = window.innerHeight - items.length * 28 - 20;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed", zIndex: 9999,
        left: Math.min(x, maxX), top: Math.min(y, Math.max(0, maxY)),
        background: t.menuBg, border: `1px solid ${t.borderLight}`,
        borderRadius: 6, padding: "4px 0", minWidth: 220,
        boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
        backdropFilter: "saturate(180%) blur(8px)",
      }}
    >
      {items.map((item, i) =>
        item.type === "separator" ? (
          <div key={i} style={{ height: 1, background: t.border, margin: "4px 0" }} />
        ) : (
          <CtxMenuItem key={i} item={item} onClose={onClose} />
        ),
      )}
    </div>,
    document.body,
  );
}

function CtxMenuItem({ item, onClose }: { item: MenuItemDef; onClose: () => void }) {
  const { tokens: t } = useTheme();
  const off = item.disabled ?? false;

  return (
    <div
      onClick={off ? undefined : () => { onClose(); item.action?.(); }}
      onMouseEnter={(e) => { if (!off) (e.currentTarget as HTMLElement).style.background = t.listActive; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      style={{
        display: "flex", alignItems: "center", padding: "4px 16px",
        cursor: off ? "default" : "pointer", fontSize: 13,
        color: off ? t.fgDim : t.fg, minHeight: 26, opacity: off ? 0.5 : 1,
      }}
    >
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.shortcut && (
        <span style={{ color: t.fgDim, fontSize: 11, marginLeft: 24 }}>{item.shortcut}</span>
      )}
    </div>
  );
}
