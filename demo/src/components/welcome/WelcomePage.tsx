// ── React Welcome Page — Monaco Vanced branded ───────────────

import { useState } from "react";
import { useTheme } from "../theme";
import { CommandEvents, DialogEvents, FileEvents, NotificationEvents, SettingsEvents, SidebarEvents } from "@enjoys/monaco-vanced/core/events";

type Emit = (ev: string, payload: unknown) => void;

interface FileInfo {
  uri: string;
  name: string;
}

export function WelcomePage({ emit, recentFiles }: { emit: Emit; recentFiles: FileInfo[] }) {
  const { tokens: t } = useTheme();

  const showAboutDialog = () => {
    emit(NotificationEvents.Show, { id: "about-dialog", type: "info", message: "Monaco Vanced IDE — v0.2.0 — Plugin-based Architecture", duration: 4000 });
    emit(DialogEvents.Show, {
      title: "About Monaco Vanced",
      body: "Monaco Vanced IDE v0.2.0\n\nA plugin-based editor built on Monaco Editor with full theming, extensions, filesystem, and language support.\n\nPowered by Bun + Vite + React 19.",
      type: "confirm",
      actions: [{ id: "ok", label: "OK", primary: true }],
    });
  };

  const showDocsDialog = () => {
    emit(NotificationEvents.Show, { id: "docs-dialog", type: "info", message: "Opening documentation…", duration: 2000 });
    emit(DialogEvents.Show, {
      title: "Documentation",
      body: "Monaco Vanced documentation is available at:\n\nhttps://github.com/enjoys-in/monaco-vanced\n\nIncludes guides for plugin development, theming, filesystem adapters, and extension authoring.",
      type: "confirm",
      actions: [{ id: "ok", label: "OK", primary: true }],
    });
  };

  const showWelcomeNotif = () => {
    emit(NotificationEvents.Show, { id: "welcome-notif", type: "info", message: "Welcome to Monaco Vanced IDE! Explore the sidebar, open files, and try the command palette.", duration: 5000 });
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", padding: "40px 24px",
      overflowY: "auto", userSelect: "none",
    }}>
      {/* Logo */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 72, height: 72, borderRadius: 16,
        background: `linear-gradient(135deg, color-mix(in srgb, ${t.accent} 13%, transparent), color-mix(in srgb, ${t.accent} 3%, transparent))`,
        marginBottom: 20,
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" style={{ color: t.accent }}>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>

      <div style={{ fontSize: 24, fontWeight: 300, marginBottom: 4, letterSpacing: "-0.5px" }}>
        Monaco Vanced
      </div>
      <div style={{ fontSize: 13, color: t.fgDim, marginBottom: 32 }}>
        Plugin-based IDE — v0.2.0
      </div>

      <div style={{ width: "100%", maxWidth: 680 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Left column */}
          <div>
            <Section title="Start">
              <ActionRow icon="file" label="New File…" shortcut="Ctrl+N"
                onClick={() => emit(CommandEvents.Execute, { id: "workbench.action.files.newUntitledFile" })} />
              <ActionRow icon="folder" label="Open Folder…" shortcut="Ctrl+K Ctrl+O"
                onClick={() => {
                  emit(NotificationEvents.Show, { id: "open-folder", type: "info", message: "Open Folder: Not available in browser demo", duration: 3000 });
                  emit(DialogEvents.Show, {
                    title: "Open Folder",
                    body: "The Open Folder feature is not available in the browser demo. In a desktop environment, this would open a native file picker.",
                    type: "confirm",
                    actions: [{ id: "ok", label: "OK", primary: true }],
                  });
                }} />
              <ActionRow icon="clone" label="Clone Repository…"
                onClick={() => {
                  emit(NotificationEvents.Show, { id: "clone-repo", type: "info", message: "Clone: Not available in browser demo", duration: 3000 });
                  emit(DialogEvents.Show, {
                    title: "Clone Repository",
                    body: "Git clone is not available in the browser demo. This feature requires a backend Git service.",
                    type: "confirm",
                    actions: [{ id: "ok", label: "OK", primary: true }],
                  });
                }} />
            </Section>

            <Section title="Recent">
              {recentFiles.slice(0, 5).map((f) => (
                <ActionRow
                  key={f.uri}
                  icon="file-code"
                  label={f.name}
                  shortcut={f.uri}
                  isPath
                  onClick={() => emit(FileEvents.Open, { uri: f.uri, label: f.name })}
                />
              ))}
            </Section>
          </div>

          {/* Right column */}
          <div>
            <Section title="Help">
              <ActionRow icon="terminal" label="Command Palette" shortcut="Ctrl+Shift+P"
                onClick={() => emit(CommandEvents.Execute, { id: "workbench.action.showCommands" })} />
              <ActionRow icon="settings" label="Settings" shortcut="Ctrl+,"
                onClick={() => emit(SettingsEvents.UIOpen, {})} />
              <ActionRow icon="extensions" label="Browse Extensions" shortcut="Ctrl+Shift+X"
                onClick={() => emit(SidebarEvents.ViewActivate, { viewId: "extensions" })} />
              <ActionRow icon="keyboard" label="Keyboard Shortcuts"
                onClick={() => emit(SettingsEvents.UIOpen, { category: "keybindings" })} />
            </Section>

            <Section title="Learn">
              <ActionRow icon="book" label="Welcome"
                onClick={showWelcomeNotif} />
              <ActionRow icon="docs" label="Documentation"
                onClick={showDocsDialog} />
              <ActionRow icon="info" label="About"
                onClick={showAboutDialog} />
            </Section>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 40, fontSize: 11, color: t.fgDim, textAlign: "center", opacity: 0.6 }}>
        Tip: Toggle sidebar with Ctrl+B • Toggle panel with Ctrl+J
      </div>
    </div>
  );
}

// ── Section ──────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { tokens: t } = useTheme();
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 11, textTransform: "uppercase", letterSpacing: "0.8px",
        color: t.fgDim, marginBottom: 8, paddingLeft: 4, fontWeight: 600,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ── Action Row ───────────────────────────────────────────────
function ActionRow({
  icon, label, shortcut, isPath, onClick,
}: {
  icon: string;
  label: string;
  shortcut?: string;
  isPath?: boolean;
  onClick: () => void;
}) {
  const { tokens: t } = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "5px 8px", borderRadius: 5, cursor: "pointer",
        background: hovered ? t.listHover : "transparent",
        transition: "background .12s",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, color: t.accent, flexShrink: 0 }}>
        <WelcomeIcon name={icon} />
      </span>
      <span style={{
        fontSize: 13, color: isPath ? t.textLink : t.fg,
        flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {label}
      </span>
      {shortcut && (
        <span style={isPath ? {
          fontSize: 11, color: t.fgDim, flexShrink: 0,
        } : {
          fontSize: 11, color: t.fgDim, padding: "1px 5px",
          background: t.inputBg, border: `1px solid ${t.borderLight}`,
          borderRadius: 3, flexShrink: 0, fontFamily: "inherit",
        }}>
          {shortcut}
        </span>
      )}
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────────
function WelcomeIcon({ name }: { name: string }) {
  const icons: Record<string, JSX.Element> = {
    "file": <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.71 4.29l-3-3L10 1H4L3 2v12l1 1h8l1-1V5l-.29-.71zM13 14H4V2h5v4h4v8zm-3-9V2l3 3h-3z"/></svg>,
    "folder": <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M14.5 3H7.71l-.85-.85L6.51 2h-5l-.5.5v11l.5.5h13l.5-.5v-10L14.5 3zm-.51 8.49V13H2V3h4.29l.85.85.36.15h6.49v7.49z"/></svg>,
    "clone": <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 1.5l.5-.5h5l4 4v9l-.5.5h-9l-.5-.5v-13zM5 2v11h8V6H9.5L9 5.5V2H5zm4 0v3h3L9 2zM3 4H2v11h8v-1H3V4z"/></svg>,
    "file-code": <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M10.57 1.14l3.28 3.3.15.36v9.7l-.5.5h-11l-.5-.5v-13l.5-.5h7.72l.35.14zM10 5h3l-3-3v3zM3 14h10V6H9.5L9 5.5V2H3v12z"/></svg>,
    "terminal": <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 3.5l.5-.5h13l.5.5v9l-.5.5h-13l-.5-.5v-9zM2 12h12V4H2v8zm6.146-3.146l-2-2 .708-.708L9.207 8.5l-2.353 2.354-.708-.708 2-2z"/></svg>,
    "settings": <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M9.1 4.4L8.6 2H7.4l-.5 2.4-.7.3-2-1.3-.9.8 1.3 2-.3.7-2.4.5v1.2l2.4.5.3.7-1.3 2 .8.8 2-1.3.7.3.5 2.4h1.2l.5-2.4.7-.3 2 1.3.9-.8-1.3-2 .3-.7 2.4-.5V6.8l-2.4-.5-.3-.7 1.3-2-.8-.8-2 1.3-.7-.3zM8 10a2 2 0 110-4 2 2 0 010 4z"/></svg>,
    "extensions": <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.5 1.5L15 0h-4.5L9 1.5V6l1.5 1.5H15L16.5 6V1.5h-3zm-9 0L6 0H1.5L0 1.5V6l1.5 1.5H6L7.5 6V1.5h-3zm0 9L6 9H1.5L0 10.5V15l1.5 1.5H6L7.5 15V10.5h-3zm9 0L15 9h-4.5L9 10.5V15l1.5 1.5H15L16.5 15V10.5h-3z"/></svg>,
    "keyboard": <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M14 3H2a1 1 0 00-1 1v8a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1zm0 9H2V4h12v8zM3 5h2v2H3V5zm3 0h2v2H6V5zm3 0h2v2H9V5zm3 0h1v2h-1V5zM3 8h1v2H3V8zm2 0h6v2H5V8zm7 0h1v2h-1V8z"/></svg>,
    "book": <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M14.5 2H9l-1 1-1-1H1.5l-.5.5v10l.5.5H7l1 1 1-1h5.5l.5-.5v-10l-.5-.5zM7 12H2V3h5v9zm7 0H9V3h5v9z"/></svg>,
    "docs": <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 1h10l.5.5v13l-.5.5H3l-.5-.5v-13L3 1zm1 1v11h8V2H4zm1 2h6v1H5V4zm0 2h6v1H5V6zm0 2h4v1H5V8z"/></svg>,
    "info": <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 13A6 6 0 118 2a6 6 0 010 12zm-.75-9.5h1.5v1.5h-1.5V4.5zm0 3h1.5V12h-1.5V7.5z"/></svg>,
  };
  return icons[name] ?? icons["file"];
}
