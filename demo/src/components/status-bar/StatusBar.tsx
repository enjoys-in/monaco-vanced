// ── Status Bar — React ───────────────────────────────────────

import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { useTheme } from "../theme";
import { StatusbarEvents } from "@enjoys/monaco-vanced/core/events";

// ── Codicon SVG map ──────────────────────────────────────────
const CODICONS: Record<string, string> = {
  "git-branch": `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M14 4a2 2 0 10-2.47 1.94A2.5 2.5 0 019 8.5H7a4.47 4.47 0 00-1 .12V5.94a2 2 0 10-2 0v4.12A2 2 0 106 12a2.5 2.5 0 012.5-2.5H9a4.5 4.5 0 004.45-3.06A2 2 0 0014 4zM5 3a1 1 0 110 2 1 1 0 010-2zm0 10a1 1 0 110-2 1 1 0 010 2zm7-8a1 1 0 110-2 1 1 0 010 2z"/></svg>`,
  "sync": `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2.006 8.267L.78 9.5 0 8.73l2.09-2.07.76.01 2.09 2.12-.71.71-1.34-1.34C3.21 11.03 5.9 13 9 13c1.62 0 3.09-.66 4.17-1.74l.71.71A6.97 6.97 0 019 14c-3.47 0-6.4-2.3-7.38-5.46L.78 9.5zM14 8c0-2.76-2.24-5-5-5a4.99 4.99 0 00-3.88 1.84l1.34 1.34-.71.71L3.66 4.82l-.01-.76L5.72 2l.71.71L5.18 3.96A5.97 5.97 0 019 2c3.31 0 6 2.69 6 6h-1z"/></svg>`,
  "error": `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  "warning": `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M7.56 1.5a.5.5 0 01.88 0l6.5 12A.5.5 0 0114.5 14H1.5a.5.5 0 01-.44-.75l6.5-12zM7.25 6v4h1.5V6h-1.5zm0 5v1.5h1.5V11h-1.5z"/></svg>`,
  "check": `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z"/></svg>`,
  "feedback": `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6 1h4l.5.5V6l4.5 4.5-.5.5-4.5-4.5H6l-.5-.5V1.5L6 1z"/><path d="M1.5 9.5l.5-.5h4l.5.5v4L2 9.5z"/></svg>`,
  "bell": `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.377 10.573a7.63 7.63 0 01-.383-2.38V6.195a5.115 5.115 0 00-1.268-3.446 5.138 5.138 0 00-3.242-1.722c-.694-.072-1.4 0-2.07.227-.67.215-1.28.574-1.794 1.053a4.923 4.923 0 00-1.208 1.675 5.067 5.067 0 00-.431 2.022v2.2a7.61 7.61 0 01-.383 2.37L2 12H6a2 2 0 104 0h4l-.623-1.427zM8 14a1 1 0 01-1-1h2a1 1 0 01-1 1z"/></svg>`,
};

// ── Types ────────────────────────────────────────────────────
interface StatusItem {
  id: string;
  label: string;
  tooltip?: string;
  alignment?: "left" | "right";
  command?: string;
  visible?: boolean;
  priority?: number;
}

export interface StatusBarProps {
  eventBus: { emit(ev: string, payload: unknown): void; on(ev: string, fn: (p: unknown) => void): void; off(ev: string, fn: (p: unknown) => void): void };
  commandApi?: { execute(id: string, ...args: unknown[]): void };
  statusbarApi?: { getItems(align: "left" | "right"): StatusItem[] };
}

/** Parse "$(icon) text" syntax into HTML with SVG icons */
function parseCodiconLabel(label: string): string {
  return label.replace(/\$\(([^)]+)\)/g, (_, name: string) => {
    const svg = CODICONS[name];
    return svg ? `<span style="display:inline-flex;align-items:center;vertical-align:middle;margin-right:2px;">${svg}</span>` : `$(${name})`;
  });
}

// ── Single Status Item ───────────────────────────────────────
function StatusItemEl({ item, onClick }: { item: StatusItem; onClick?: () => void }) {
  if (item.visible === false) return null;

  return (
    <span
      className="vsc-status-item"
      data-id={item.id}
      title={item.tooltip ?? ""}
      onClick={onClick}
      style={{
        cursor: item.command ? "pointer" : "default",
        padding: "0 6px", height: "100%",
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: 12, whiteSpace: "nowrap",
      }}
      dangerouslySetInnerHTML={{ __html: parseCodiconLabel(item.label) }}
    />
  );
}

// ── StatusBar Component ──────────────────────────────────────
export function StatusBar({ eventBus, commandApi, statusbarApi }: StatusBarProps) {
  const [items, setItems] = useState<Map<string, StatusItem>>(() => {
    const map = new Map<string, StatusItem>();
    if (statusbarApi) {
      statusbarApi.getItems("left").forEach((i) => map.set(i.id, i));
      statusbarApi.getItems("right").forEach((i) => map.set(i.id, i));
    }
    return map;
  });

  useEffect(() => {
    const onRegister = (p: unknown) => {
      const item = p as StatusItem;
      setItems((prev) => new Map(prev).set(item.id, item));
    };
    const onUpdate = (p: unknown) => {
      const item = p as StatusItem;
      setItems((prev) => {
        const next = new Map(prev);
        const existing = next.get(item.id);
        if (existing) next.set(item.id, { ...existing, ...item });
        return next;
      });
    };
    const onRemove = (p: unknown) => {
      const { id } = p as { id: string };
      setItems((prev) => { const next = new Map(prev); next.delete(id); return next; });
    };

    eventBus.on(StatusbarEvents.ItemRegister, onRegister);
    eventBus.on(StatusbarEvents.ItemUpdate, onUpdate);
    eventBus.on(StatusbarEvents.ItemRemove, onRemove);
    return () => {
      eventBus.off(StatusbarEvents.ItemRegister, onRegister);
      eventBus.off(StatusbarEvents.ItemUpdate, onUpdate);
      eventBus.off(StatusbarEvents.ItemRemove, onRemove);
    };
  }, [eventBus]);

  const left: StatusItem[] = [];
  const right: StatusItem[] = [];
  for (const item of items.values()) {
    (item.alignment === "right" ? right : left).push(item);
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 0, height: "100%" }}>
        {left.map((item) => (
          <StatusItemEl
            key={item.id}
            item={item}
            onClick={item.command && commandApi ? () => commandApi.execute(item.command!) : undefined}
          />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginLeft: "auto", height: "100%" }}>
        {right.map((item) => (
          <StatusItemEl
            key={item.id}
            item={item}
            onClick={item.command && commandApi ? () => commandApi.execute(item.command!) : undefined}
          />
        ))}
      </div>
    </>
  );
}
