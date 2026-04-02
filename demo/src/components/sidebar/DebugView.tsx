// ── Debug View (React) ───────────────────────────────────────

import { useState } from "react";
import { useTheme } from "../theme";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";

interface Props {
  eventBus: InstanceType<typeof EventBus>;
  notificationApi?: { show(opts: { type: string; message: string; duration: number }): void };
}

const CONFIGS = [
  { name: "Launch Program", desc: "Node.js" },
  { name: "Attach to Process", desc: "Node.js" },
  { name: "Launch Chrome", desc: "Chrome" },
];
const SECTIONS = ["Variables", "Watch", "Call Stack", "Breakpoints"];

export function DebugView({ notificationApi }: Props) {
  const { tokens: t } = useTheme();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleSection = (name: string) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div style={{ padding: "10px 12px", overflowY: "auto", height: "100%" }}>
      <button
        className="vsc-btn vsc-btn-primary"
        style={{ width: "100%", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        onClick={() => notificationApi?.show({ type: "info", message: "Debug session started — Launch Program (Node.js)", duration: 4000 })}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l10 6-10 6V2z" /></svg>
        <span>Run and Debug</span>
      </button>

      <div className="vsc-card" style={{ marginBottom: 14 }}>
        {CONFIGS.map((cfg) => (
          <div
            key={cfg.name}
            className="vsc-file-item"
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", cursor: "pointer", fontSize: 13 }}
          >
            <span style={{ color: t.successGreen, display: "flex" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l10 6-10 6V2z" /></svg>
            </span>
            <span style={{ color: t.fg, flex: 1 }}>{cfg.name}</span>
            <span className="vsc-tag">{cfg.desc}</span>
          </div>
        ))}
      </div>

      <div>
        {SECTIONS.map((name) => {
          const isExpanded = expanded[name] ?? false;
          return (
            <div key={name}>
              <div
                className="vsc-section-header"
                style={{ cursor: "pointer" }}
                onClick={() => toggleSection(name)}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <span style={{
                    display: "inline-flex", transition: "transform .12s",
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0)",
                    marginRight: 4,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 16 16">
                      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </span>
                  <span>{name}</span>
                </span>
              </div>
              {isExpanded && (
                <div style={{ padding: "4px 8px", color: t.fgDim, fontSize: 12 }}>
                  No {name.toLowerCase()} available.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
