// ── Accounts View (React) ────────────────────────────────────

import { useTheme } from "../theme";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";

interface Props {
  eventBus: InstanceType<typeof EventBus>;
  notificationApi?: { show(opts: { type: string; message: string; duration: number }): void };
}

const ACTIONS = [
  {
    label: "Sign in with GitHub",
    icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`,
    msg: "GitHub OAuth: Redirecting to GitHub for authentication...",
  },
  {
    label: "Sign in with Microsoft",
    icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6.5" height="6.5" fill="#f25022"/><rect x="8.5" y="1" width="6.5" height="6.5" fill="#7fba00"/><rect x="1" y="8.5" width="6.5" height="6.5" fill="#00a4ef"/><rect x="8.5" y="8.5" width="6.5" height="6.5" fill="#ffb900"/></svg>`,
    msg: "Microsoft OAuth: Redirecting to Microsoft for authentication...",
  },
  {
    label: "Turn on Settings Sync",
    icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 1H7l.5.5v5l-.5.5H2.5l-.5-.5v-5l.5-.5zM3 6h4V2H3v4zm6.5-5H14l.5.5v5l-.5.5H9.5l-.5-.5v-5l.5-.5zm.5 5h4V2h-4v4zm-7 3H7l.5.5v5l-.5.5H2.5l-.5-.5v-5l.5-.5zM3 14h4v-4H3v4zm6.5-5H14l.5.5v5l-.5.5H9.5l-.5-.5v-5l.5-.5zm.5 5h4v-4h-4v4z"/></svg>`,
    msg: "Settings Sync: Enable sync to keep your settings across devices.",
  },
];

export function AccountsView({ notificationApi }: Props) {
  const { tokens: t } = useTheme();

  return (
    <div style={{ padding: "20px 16px", overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: `linear-gradient(135deg, ${t.accent}, ${t.buttonHoverBg})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontSize: 22, fontWeight: 600, marginBottom: 12,
        boxShadow: "0 2px 8px rgba(0,122,204,0.3)",
      }}>U</div>
      <div style={{ fontSize: 15, color: t.fg, fontWeight: 500, marginBottom: 2 }}>User</div>
      <div style={{ fontSize: 12, color: t.fgDim, marginBottom: 20 }}>user@example.com</div>
      <div className="vsc-card" style={{ width: "100%", maxWidth: 280 }}>
        {ACTIONS.map((action) => (
          <div
            key={action.label}
            className="vsc-file-item"
            style={{ display: "flex", alignItems: "center", gap: 10, height: 36, padding: "0 12px", cursor: "pointer", fontSize: 13, color: t.fg }}
            onClick={() => notificationApi?.show({ type: "info", message: action.msg, duration: 4000 })}
          >
            <span style={{ display: "flex", alignItems: "center", flexShrink: 0, color: t.fgDim }} dangerouslySetInnerHTML={{ __html: action.icon }} />
            <span>{action.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
