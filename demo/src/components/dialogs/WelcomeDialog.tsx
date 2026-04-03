// ── Welcome Dialog — first-visit modal ───────────────────────

import { useState, useEffect } from "react";
import { useTheme } from "../theme";

const STORAGE_KEY = "monaco-vanced:welcomed";
const VERSION = "0.2.0";
const GITHUB_URL = "https://github.com/enjoys-in/monaco-vanced";

export function WelcomeDialog() {
  const { tokens: t } = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem(STORAGE_KEY, Date.now().toString()); } catch { /* ignore */ }
  };

  return (
    <div
      onClick={dismiss}
      style={{
        position: "fixed", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)",
        zIndex: 99999, animation: "fadeIn .2s ease",
      }}
    >
      {/* Dialog card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 460, maxWidth: "90vw",
          background: t.editorBg, color: t.fg,
          borderRadius: 12, overflow: "hidden",
          boxShadow: "0 16px 48px rgba(0,0,0,.45)",
          border: `1px solid ${t.border}`,
          animation: "scaleIn .25s ease",
        }}
      >
        {/* Header with gradient accent */}
        <div style={{
          padding: "32px 28px 20px",
          background: `linear-gradient(135deg, color-mix(in srgb, ${t.accent} 15%, transparent), color-mix(in srgb, ${t.accent} 5%, transparent))`,
          textAlign: "center",
        }}>
          {/* Logo */}
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 64, height: 64, borderRadius: 16,
            background: `linear-gradient(135deg, color-mix(in srgb, ${t.accent} 25%, transparent), color-mix(in srgb, ${t.accent} 8%, transparent))`,
            marginBottom: 16,
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" style={{ color: t.accent }}>
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>

          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.3px", marginBottom: 4 }}>
            Monaco Vanced
          </div>
          <div style={{ fontSize: 12, color: t.fgDim, fontWeight: 500 }}>
            v{VERSION} — Plugin-based IDE
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 28px 24px" }}>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: t.fgDim, margin: "0 0 18px" }}>
            A fully extensible, event-driven code editor built on Monaco Editor
            with <strong style={{ color: t.fg }}>85+ composable plugins</strong>, real-time theming, filesystem, AI chat, and more.
          </p>

          {/* Feature pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
            {["85+ Plugins", "50+ Themes", "AI Chat", "LSP Bridge", "Git SCM", "Extensions", "Terminal", "Debugger"].map((f) => (
              <span key={f} style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 100,
                background: `color-mix(in srgb, ${t.accent} 12%, transparent)`,
                color: t.accent, fontWeight: 500,
              }}>{f}</span>
            ))}
          </div>

          {/* Links */}
          <div style={{ display: "flex", gap: 12, marginBottom: 22 }}>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 12, color: t.textLink, textDecoration: "none",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              enjoys-in/monaco-vanced
            </a>

            <span style={{ fontSize: 12, color: t.fgDim }}>•</span>

            <a
              href={`${GITHUB_URL}/blob/main/README.md`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: t.textLink, textDecoration: "none" }}
            >
              Documentation
            </a>

            <span style={{ fontSize: 12, color: t.fgDim }}>•</span>

            <a
              href={`${GITHUB_URL}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: t.textLink, textDecoration: "none" }}
            >
              Issues
            </a>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              onClick={dismiss}
              style={{
                padding: "7px 20px", borderRadius: 6, border: "none",
                background: t.accent, color: t.badgeFg,
                fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(.95) translateY(8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      `}</style>
    </div>
  );
}
