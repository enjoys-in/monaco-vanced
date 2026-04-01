// ── Context Menu — React ─────────────────────────────────────

import { useState, useEffect, useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../theme";
import { ContextMenuEvents } from "@enjoys/monaco-vanced/core/events";

interface MenuItem {
  label: string;
  command?: string;
  type?: "separator" | "item";
  keybinding?: string;
  disabled?: boolean;
}

export interface ContextMenuProps {
  eventBus: { emit(ev: string, payload: unknown): void; on(ev: string, fn: (p: unknown) => void): void; off(ev: string, fn: (p: unknown) => void): void };
  commandApi?: { execute(id: string, ...args: unknown[]): void };
  contextMenuApi?: { dismiss(): void };
}

function MenuRow({ item, onAction }: { item: MenuItem; onAction: () => void }) {
  const { tokens: t } = useTheme();
  const [hovered, setHovered] = useState(false);

  if (item.type === "separator") {
    return <div style={{ height: 1, background: t.border, margin: "4px 0" }} />;
  }

  return (
    <div
      onClick={item.disabled ? undefined : onAction}
      onMouseEnter={() => !item.disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", padding: "4px 24px 4px 8px",
        cursor: item.disabled ? "default" : "pointer",
        fontSize: 13, color: item.disabled ? t.fgDim : t.fg, minHeight: 24,
        background: hovered ? t.listActive : "transparent",
      }}
    >
      <span style={{ width: 20, display: "inline-flex", justifyContent: "center" }} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.keybinding && (
        <span style={{ color: t.fgDim, fontSize: 12, marginLeft: 24 }}>{item.keybinding}</span>
      )}
    </div>
  );
}

export function ContextMenu({ eventBus, commandApi, contextMenuApi }: ContextMenuProps) {
  const { tokens: t } = useTheme();
  const [state, setState] = useState<{ items: MenuItem[]; x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const dismiss = () => {
    if (contextMenuApi) contextMenuApi.dismiss();
    else setState(null);
  };

  useEffect(() => {
    const onShow = (p: unknown) => {
      const { items, x, y } = p as { items: MenuItem[]; x: number; y: number };
      // Clamp to viewport
      const maxX = window.innerWidth - 220;
      const maxY = window.innerHeight - items.length * 28 - 20;
      setState({ items, x: Math.min(x, maxX), y: Math.min(y, Math.max(0, maxY)) });
    };
    const onDismiss = () => setState(null);

    eventBus.on(ContextMenuEvents.Show, onShow);
    eventBus.on(ContextMenuEvents.Dismiss, onDismiss);
    return () => {
      eventBus.off(ContextMenuEvents.Show, onShow);
      eventBus.off(ContextMenuEvents.Dismiss, onDismiss);
    };
  }, [eventBus]);

  // Close on outside click
  useEffect(() => {
    if (!state) return;
    const handler = (e: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) dismiss();
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handler); };
  }, [state]);

  if (!state) return null;

  const menuStyle: CSSProperties = {
    position: "fixed", left: state.x, top: state.y, zIndex: 9999,
    background: t.menuBg, border: `1px solid ${t.borderLight}`,
    borderRadius: 6, padding: "4px 0", minWidth: 200,
    boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
    backdropFilter: "saturate(180%) blur(8px)",
  };

  return createPortal(
    <div ref={ref} style={menuStyle}>
      {state.items.map((item, i) => (
        <MenuRow
          key={i}
          item={item}
          onAction={() => {
            dismiss();
            if (item.command && commandApi) commandApi.execute(item.command);
          }}
        />
      ))}
    </div>,
    document.body,
  );
}
