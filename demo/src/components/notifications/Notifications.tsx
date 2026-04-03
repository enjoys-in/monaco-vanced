// ── Toast Notifications — React ──────────────────────────────

import { useState, useEffect, useCallback, useRef, type CSSProperties } from "react";
import { NotificationEvents } from "@enjoys/monaco-vanced/core/events";
import { useTheme } from "../theme";

// ── Types ────────────────────────────────────────────────────
interface NotificationData {
  id: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  actions?: { id?: string; label: string; command?: string }[] | string[];
  autoHide?: boolean;
  duration?: number;
  progress?: number;
  category?: string;
}

export interface NotificationsProps {
  eventBus: { emit(ev: string, payload: unknown): void; on(ev: string, fn: (p: unknown) => void): void; off(ev: string, fn: (p: unknown) => void): void };
}

// ── SVG icons per type ───────────────────────────────────────
const ICONS: Record<string, string> = {
  info:    `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#3794ff" stroke-width="1.2"/><rect x="7.25" y="4" width="1.5" height="1.5" rx=".5" fill="#3794ff"/><rect x="7.25" y="6.5" width="1.5" height="4.5" rx=".5" fill="#3794ff"/></svg>`,
  success: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#89d185" stroke-width="1.2"/><path d="M5 8.5l2 2 4-4.5" stroke="#89d185" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  warning: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M7.56 2.45a.5.5 0 01.88 0l5.5 10.5A.5.5 0 0113.5 14h-11a.5.5 0 01-.44-.75l5.5-10.5z" stroke="#cca700" stroke-width="1.1" fill="none"/><rect x="7.25" y="6" width="1.5" height="3.5" rx=".5" fill="#cca700"/><rect x="7.25" y="10.5" width="1.5" height="1.5" rx=".5" fill="#cca700"/></svg>`,
  error:   `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#f14c4c" stroke-width="1.2"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#f14c4c" stroke-width="1.3" stroke-linecap="round"/></svg>`,
};

const CHEVRON = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const TRUNCATE_LEN = 100;

// ── Inject CSS once ──────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("vsc-notif-css")) {
  const css = document.createElement("style");
  css.id = "vsc-notif-css";
  css.textContent = `
    @keyframes vsc-notif-in  { from { transform:translateX(30px); opacity:0 } to { transform:translateX(0); opacity:1 } }
    @keyframes vsc-notif-out { from { transform:translateX(0); opacity:1 } to { transform:translateX(30px); opacity:0 } }
    .vsc-toast { animation: vsc-notif-in .2s ease-out; pointer-events:auto }
    .vsc-toast-dismiss { animation: vsc-notif-out .15s ease-in forwards }
    .vsc-toast:hover .vsc-toast-close { opacity:1 }
    .vsc-toast-close { opacity:0; transition:opacity .12s }
    .vsc-toast-action {
      background:none; border:1px solid var(--vsc-border-light); color:var(--vsc-fg); padding:2px 8px;
      border-radius:2px; cursor:pointer; font-size:12px; font-family:inherit; line-height:18px;
      white-space:nowrap;
    }
    .vsc-toast-action:hover { background:var(--vsc-hover) }
    .vsc-toast-expand-btn { background:none; border:none; color:var(--vsc-fg-dim); cursor:pointer; padding:0; display:flex; align-items:center; transition:transform .15s }
    .vsc-toast-expand-btn[data-expanded="true"] { transform:rotate(90deg) }
    .vsc-toast-progress { height:2px; background:var(--vsc-accent); border-radius:0 0 3px 3px; transition:width .3s linear }
  `;
  document.head.appendChild(css);
}

// ── Single Toast ─────────────────────────────────────────────
function Toast({ n, onDismiss }: {
  n: NotificationData; onDismiss: (id: string) => void;
}) {
  const { tokens: t } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const isLong = n.message.length > TRUNCATE_LEN;

  // Auto-dismiss
  useEffect(() => {
    if (n.autoHide !== false) {
      timerRef.current = setTimeout(() => onDismiss(n.id), n.duration ?? 5000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [n.id, n.autoHide, n.duration, onDismiss]);

  const handleDismiss = useCallback(() => {
    setDismissing(true);
    setTimeout(() => onDismiss(n.id), 150);
  }, [n.id, onDismiss]);

  const toastStyle: CSSProperties = {
    display: "flex", flexDirection: "column",
    background: t.menuBg, border: `1px solid ${t.border}`, borderRadius: 3,
    boxShadow: "0 4px 16px rgba(0,0,0,.45)", width: 350, maxWidth: 350,
    overflow: "hidden", fontSize: 13, lineHeight: 1.4,
  };

  const displayMsg = isLong && !expanded
    ? n.message.slice(0, TRUNCATE_LEN) + "…"
    : n.message;

  const actions = n.actions?.map((a) =>
    typeof a === "string" ? { label: a } : a,
  );

  return (
    <div
      className={`vsc-toast${dismissing ? " vsc-toast-dismiss" : ""}`}
      data-toast-id={n.id}
      style={toastStyle}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", padding: "8px 8px 0 10px", gap: 8 }}>
        {/* Icon */}
        <span
          style={{ flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", width: 16, height: 16 }}
          dangerouslySetInnerHTML={{ __html: ICONS[n.type ?? "info"] ?? ICONS.info }}
        />
        {/* Message */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ color: t.fg, wordWrap: "break-word" }}>
            {n.category && <span style={{ fontWeight: 600, color: t.fg }}>{n.category}: </span>}
            {displayMsg}
          </span>
        </div>
        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0, marginLeft: "auto" }}>
          {isLong && (
            <button
              className="vsc-toast-expand-btn"
              data-expanded={String(expanded)}
              title="Toggle Details"
              onClick={() => setExpanded(!expanded)}
              dangerouslySetInnerHTML={{ __html: CHEVRON }}
            />
          )}
          <button
            className="vsc-toast-close"
            title="Close Notification"
            style={{
              background: "none", border: "none", color: t.fgDim,
              cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px",
              display: "flex", alignItems: "center",
            }}
            onClick={handleDismiss}
          >
            ×
          </button>
        </div>
      </div>

      {/* Actions */}
      {actions?.length ? (
        <div style={{ display: "flex", gap: 6, padding: "6px 10px 8px 34px" }}>
          {actions.map((a, i) => (
            <button
              key={i}
              className="vsc-toast-action"
              onClick={() => onDismiss(n.id)}
            >
              {a.label}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ paddingBottom: 8 }} />
      )}

      {/* Progress bar */}
      {n.progress != null && (
        <div style={{ height: 2, background: t.inputBg, borderRadius: "0 0 3px 3px", overflow: "hidden" }}>
          <div
            className="vsc-toast-progress"
            style={{ width: `${Math.min(100, Math.max(0, n.progress))}%`, background: t.accent }}
          />
        </div>
      )}
    </div>
  );
}

// ── Notifications Container ──────────────────────────────────
export function Notifications({ eventBus }: NotificationsProps) {
  const [toasts, setToasts] = useState<NotificationData[]>([]);

  const dismiss = useCallback((id: string) => {
    eventBus.emit(NotificationEvents.Dismiss, { id });
  }, [eventBus]);

  useEffect(() => {
    const onShow = (p: unknown) => {
      const raw = p as Partial<NotificationData>;
      const n: NotificationData = { ...raw, id: raw.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` } as NotificationData;
      setToasts((prev) => {
        // Deduplicate: if same message already visible, skip
        if (prev.some((t) => t.message === n.message)) return prev;
        return [...prev.filter((t) => t.id !== n.id), n];
      });
    };
    const onDismiss = (p: unknown) => {
      const { id } = p as { id: string };
      setToasts((prev) => prev.filter((t) => t.id !== id));
    };
    eventBus.on(NotificationEvents.Show, onShow);
    eventBus.on(NotificationEvents.Dismiss, onDismiss);
    return () => {
      eventBus.off(NotificationEvents.Show, onShow);
      eventBus.off(NotificationEvents.Dismiss, onDismiss);
    };
  }, [eventBus]);

  return (
    <>
      {toasts.map((n) => (
        <Toast key={n.id} n={n} onDismiss={dismiss} />
      ))}
    </>
  );
}
