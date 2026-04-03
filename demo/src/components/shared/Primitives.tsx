// ── Shared UI primitives for React components ────────────────

import { type CSSProperties, type ReactNode, useState, useCallback } from "react";
import { useTheme } from "../theme";

// ── Collapsible Section ──────────────────────────────────────
export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  badge,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  badge?: string | number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { tokens: t } = useTheme();

  return (
    <div>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 4px", fontSize: 11, textTransform: "uppercase",
          letterSpacing: "0.5px", color: t.fgDim, cursor: "pointer",
          userSelect: "none", borderRadius: 3,
          transition: "background .1s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--vsc-hover)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <span style={{
          display: "inline-flex", transition: "transform .15s",
          transform: open ? "rotate(90deg)" : "rotate(0)",
        }}>
          <svg width="10" height="10" viewBox="0 0 16 16">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </span>
        <span style={{ fontWeight: 600 }}>{title}</span>
        {badge != null && (
          <span style={{
            fontSize: 10, padding: "1px 6px", borderRadius: 10,
            background: t.badgeBg, color: t.badgeFg, fontWeight: 600,
            lineHeight: "16px", minWidth: 16, textAlign: "center",
          }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{
        overflow: "hidden",
        maxHeight: open ? "none" : 0,
        opacity: open ? 1 : 0,
        transition: "opacity .15s, max-height .2s",
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Search Input ─────────────────────────────────────────────
export function SearchInput({
  placeholder = "Search...",
  value,
  onChange,
  style: extraStyle,
}: {
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  style?: CSSProperties;
}) {
  const { tokens: t } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: "100%", boxSizing: "border-box",
        background: t.inputBg, color: t.fg,
        border: `1px solid ${focused ? t.focusBorder : t.inputBorder}`,
        borderRadius: 4, padding: "5px 10px",
        fontSize: 13, outline: "none",
        fontFamily: "inherit",
        transition: "border-color .15s, box-shadow .15s",
        boxShadow: focused ? `0 0 0 1px ${t.focusBorder}33` : "none",
        ...extraStyle,
      }}
    />
  );
}

// ── Tab Pill ─────────────────────────────────────────────────
export function TabPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const { tokens: t } = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "4px 12px", fontSize: 12, borderRadius: 4,
        cursor: "pointer", userSelect: "none",
        color: active ? t.fgBright : hovered ? t.fg : t.fgDim,
        background: active ? t.listActive : hovered ? t.hover : "transparent",
        transition: "all .15s",
      }}
    >
      {label}
    </div>
  );
}

// ── Icon Button ──────────────────────────────────────────────
export function IconButton({
  title,
  children,
  onClick,
  size = 28,
  style: extraStyle,
}: {
  title: string;
  children: ReactNode;
  onClick?: () => void;
  size?: number;
  style?: CSSProperties;
}) {
  const { tokens: t } = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: size, height: size,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: hovered ? t.fg : t.fgDim,
        borderRadius: 4,
        background: hovered ? t.hover : "transparent",
        transition: "background .1s, color .1s",
        ...extraStyle,
      }}
    >
      {children}
    </div>
  );
}
