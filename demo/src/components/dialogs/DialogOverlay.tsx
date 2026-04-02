// ── Dialog Overlay — renders "dialog:show" events as modals ──

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../theme";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";

interface DialogAction {
  id: string;
  label: string;
  primary?: boolean;
}

interface DialogPayload {
  title: string;
  body: string;
  type?: "confirm" | "prompt" | "info";
  actions?: DialogAction[];
}

export function DialogOverlay({ eventBus }: { eventBus: InstanceType<typeof EventBus> }) {
  const { tokens: t } = useTheme();
  const [dialog, setDialog] = useState<DialogPayload | null>(null);

  const dismiss = useCallback(() => setDialog(null), []);

  useEffect(() => {
    const onShow = (payload: unknown) => {
      setDialog(payload as DialogPayload);
    };
    eventBus.on("dialog:show", onShow);
    return () => { eventBus.off("dialog:show", onShow); };
  }, [eventBus]);

  if (!dialog) return null;

  const actions = dialog.actions ?? [{ id: "ok", label: "OK", primary: true }];

  return (
    <div
      onClick={dismiss}
      style={{
        position: "fixed", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,.45)", backdropFilter: "blur(2px)",
        zIndex: 99998, animation: "dlgFadeIn .15s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420, maxWidth: "90vw",
          background: t.editorBg, color: t.fg,
          borderRadius: 10, overflow: "hidden",
          boxShadow: "0 12px 40px rgba(0,0,0,.4)",
          border: `1px solid ${t.border}`,
          animation: "dlgScaleIn .18s ease",
        }}
      >
        {/* Title bar */}
        <div style={{
          padding: "14px 18px 10px",
          borderBottom: `1px solid ${t.border}`,
          fontWeight: 600, fontSize: 14,
        }}>
          {dialog.title}
        </div>

        {/* Body */}
        <div style={{
          padding: "14px 18px 18px",
          fontSize: 13, lineHeight: 1.6, color: t.fgDim,
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {dialog.body}
        </div>

        {/* Actions */}
        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 8,
          padding: "0 18px 14px",
        }}>
          {actions.map((a) => (
            <button
              key={a.id}
              onClick={dismiss}
              style={{
                padding: "6px 16px", borderRadius: 5, border: "none",
                background: a.primary ? t.accent : `color-mix(in srgb, ${t.fg} 12%, transparent)`,
                color: a.primary ? "#fff" : t.fg,
                fontSize: 12, fontWeight: 500, cursor: "pointer",
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes dlgFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes dlgScaleIn { from { opacity: 0; transform: scale(.96) } to { opacity: 1; transform: scale(1) } }
      `}</style>
    </div>
  );
}
