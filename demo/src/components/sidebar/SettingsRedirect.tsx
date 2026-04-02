// ── Settings Redirect View (React) ───────────────────────────

import { useTheme } from "../theme";
import { SettingsEvents } from "@enjoys/monaco-vanced/core/events";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";

interface Props {
  eventBus: InstanceType<typeof EventBus>;
}

const LINKS = [
  { label: "Text Editor", desc: "Font, cursor, minimap, formatting", action: "text-editor" },
  { label: "Workbench", desc: "Appearance, tabs, breadcrumbs", action: "workbench" },
  { label: "Plugins", desc: "Configure all plugin modules", action: "plugins" },
  { label: "Themes", desc: "Color themes & icon themes", action: "themes" },
  { label: "Keybindings", desc: "Keyboard shortcuts", action: "keybindings" },
];

export function SettingsRedirect({ eventBus }: Props) {
  const { tokens: t } = useTheme();

  return (
    <div style={{ padding: "24px 16px", textAlign: "center", overflowY: "auto", height: "100%" }}>
      <div style={{ color: t.fgDim, marginBottom: 16 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.85 8.75l4.15.83v4.84l-4.15.83 2.35 3.52-3.42 3.42-3.52-2.35-.83 4.16H9.58l-.84-4.15-3.52 2.35-3.42-3.43 2.35-3.52L0 12.42V7.58l4.15-.84L1.8 3.22 5.22 1.8l3.52 2.35L9.58 0h4.84l.84 4.15 3.52-2.35 3.42 3.42-2.35 3.53zM12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
        </svg>
      </div>
      <div style={{ fontSize: 14, color: t.fg, marginBottom: 8, fontWeight: 500 }}>Settings</div>
      <div style={{ fontSize: 12, color: t.fgDim, marginBottom: 20, lineHeight: 1.5 }}>
        Configure editor, plugins, themes, keybindings, and all workspace preferences.
      </div>
      <button
        className="vsc-btn vsc-btn-primary"
        style={{ fontSize: 13, padding: "6px 20px" }}
        onClick={() => eventBus.emit(SettingsEvents.UIOpen, {})}
      >
        Open Settings
      </button>
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
        {LINKS.map(({ label, desc, action }) => (
          <div
            key={action}
            className="vsc-file-item"
            style={{
              display: "flex", flexDirection: "column", alignItems: "flex-start",
              padding: "8px 12px", cursor: "pointer", borderRadius: 6,
            }}
            onClick={() => eventBus.emit(SettingsEvents.UIOpen, { category: action })}
          >
            <span style={{ fontSize: 13, color: t.textLink }}>{label}</span>
            <span style={{ fontSize: 11, color: t.fgDim }}>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
