// ── Extension Detail — Error page ────────────────────────────

import { useCallback } from "react";
import { useTheme } from "../theme";
import { DialogEvents } from "@enjoys/monaco-vanced/core/events";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";

interface Props {
  error: string;
  extId: string;
  eventBus: InstanceType<typeof EventBus>;
  onRetry: () => void;
}

export function ExtDetailError({ error, extId, eventBus, onRetry }: Props) {
  const { tokens: t } = useTheme();

  const handleReport = useCallback(() => {
    eventBus.emit(DialogEvents.Show, {
      type: "error",
      title: "Extension Load Failed",
      message: `Could not load details for "${extId}".\n\nError: ${error}`,
      buttons: [{ label: "OK", value: "ok" }],
    });
  }, [error, extId, eventBus]);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100%", gap: 12, padding: 32,
    }}>
      <div style={{ fontSize: 40, opacity: 0.3 }}>⚠</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: t.fg }}>
        Failed to load extension details
      </div>
      <div style={{ fontSize: 12, color: t.fgDim, textAlign: "center", maxWidth: 400 }}>
        {error}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          className="vsc-btn vsc-btn-primary"
          style={{ fontSize: 12, padding: "5px 16px" }}
          onClick={onRetry}
        >
          Retry
        </button>
        <button
          className="vsc-btn vsc-btn-secondary"
          style={{ fontSize: 12, padding: "5px 16px" }}
          onClick={handleReport}
        >
          Show Error
        </button>
      </div>
    </div>
  );
}
