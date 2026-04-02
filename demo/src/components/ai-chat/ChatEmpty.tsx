// ── Chat Empty State — suggestions grid ──────────────────────

import type { CSSProperties } from "react";
import type { ThemeTokens } from "../theme";
import type { SuggestionPrompt } from "./types";
import { SparkleIcon, SUGGESTIONS } from "./constants";

export interface ChatEmptyProps {
  tokens: ThemeTokens;
  onSend: (prompt: string) => void;
}

export function ChatEmpty({ tokens: t, onSend }: ChatEmptyProps) {
  const S: Record<string, CSSProperties> = {
    root: {
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      flex: 1, padding: 24, textAlign: "center", gap: 16,
    },
    icon: { color: t.accent, opacity: 0.7 },
    title: { fontSize: 14, fontWeight: 600, color: t.fg },
    subtitle: { fontSize: 12, color: t.fgDim, lineHeight: "1.5" },
    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, width: "100%", maxWidth: 300 },
    btn: {
      display: "flex", alignItems: "center", gap: 6,
      padding: "8px 10px", borderRadius: 6,
      border: `1px solid ${t.border}`, background: t.cardBg,
      cursor: "pointer", fontSize: 12, color: t.fg, textAlign: "left",
    },
  };

  return (
    <div style={S.root}>
      <div style={S.icon} dangerouslySetInnerHTML={{ __html: SparkleIcon.replace('width="16"', 'width="40"').replace('height="16"', 'height="40"') }} />
      <div style={S.title}>How can I help you?</div>
      <div style={S.subtitle}>
        Ask me about your code, or use the suggestions below to get started.
        <br />Type <strong>@</strong> to attach file, <strong>#</strong> to reference symbol, <strong>/</strong> for commands.
        <br />You can also <strong>drag & drop</strong> files or folders from the explorer.
      </div>
      <div style={S.grid}>
        {SUGGESTIONS.map((s: SuggestionPrompt) => (
          <div
            key={s.label}
            style={S.btn}
            onClick={() => onSend(s.prompt)}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.accent; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
