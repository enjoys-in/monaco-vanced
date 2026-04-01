// ── Activity Bar — React icon strip on the far left ──────────

import { useState, useEffect, useCallback, useRef, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../theme";
import { SidebarEvents, SettingsEvents, NotificationEvents } from "@enjoys/monaco-vanced/core/events";

// ── Icon data ────────────────────────────────────────────────
const ICONS = [
  { id: "explorer", label: "Explorer (Ctrl+Shift+E)", svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M17.5 0h-9L7 1.5V6H2.5L1 7.5v13l1.5 1.5h9l1.5-1.5V17h4.5l1.5-1.5v-14L17.5 0zm-5 20.5H2.5v-13H7v8.5l1.5 1.5h4v3zm6-5H8.5v-14h5V6l1 1h4v8.5z" fill="currentColor"/></svg>` },
  { id: "search", label: "Search (Ctrl+Shift+F)", svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15.25 0a8.25 8.25 0 00-6.18 13.72L1 21.79l1.42 1.42 8.07-8.07A8.25 8.25 0 1015.25.01V0zm0 15a6.75 6.75 0 110-13.5 6.75 6.75 0 010 13.5z" fill="currentColor"/></svg>` },
  { id: "scm", label: "Source Control (Ctrl+Shift+G)", svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21.007 8.222A3.738 3.738 0 0015.045 5.2a3.738 3.738 0 001.156 6.583 2.988 2.988 0 01-2.668 1.67h-2.99a4.456 4.456 0 00-2.989 1.165V7.753a3.737 3.737 0 002.991-3.253 3.737 3.737 0 10-7.474 0 3.737 3.737 0 002.991 3.253v8.494a3.737 3.737 0 00-2.991 3.253 3.737 3.737 0 107.474 0 3.737 3.737 0 00-2.991-3.253v-.508a2.988 2.988 0 012.99-2.992h2.99a4.456 4.456 0 004.487-3.385 3.737 3.737 0 001.497-1.142z" fill="currentColor"/></svg>` },
  { id: "debug", label: "Run and Debug (Ctrl+Shift+D)", svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M10.94 13.5l-1.32 1.32a3.73 3.73 0 00-7.24 0L1.06 13.5 0 14.56l1.72 1.72-.22.22V18H0v1.5h1.5v.08c.077.489.214.966.41 1.42L.47 22.44 1.53 23.5l1.34-1.34A3.74 3.74 0 005.5 23.5a3.74 3.74 0 002.63-1.34l1.34 1.34 1.06-1.06-1.44-1.44c.196-.454.333-.931.41-1.42V19H11v-1.5H9.5v-1.5l-.22-.22L11 14.06l-1.06-1.06zM5.5 21.5a2.25 2.25 0 01-2.25-2.25v-2c0-.18.022-.357.065-.53a2.25 2.25 0 014.37 0c.043.173.065.35.065.53v2A2.25 2.25 0 015.5 21.5zM18.5 0A3.5 3.5 0 0015 3.5a3.465 3.465 0 00.605 1.96l-4.07 4.07 1.06 1.06 4.07-4.07c.577.377 1.252.58 1.945.58h-.11A3.5 3.5 0 0018.5 0zm0 5.5a2 2 0 110-4 2 2 0 010 4z" fill="currentColor"/></svg>` },
  { id: "extensions", label: "Extensions (Ctrl+Shift+X)", svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M13.5 1.5L15 0h7.5L24 1.5V9l-1.5 1.5H15L13.5 9V1.5zM0 15l1.5-1.5H9L10.5 15v7.5L9 24H1.5L0 22.5V15zm0-12L1.5 1.5H9L10.5 3v7.5L9 12H1.5L0 10.5V3zm13.5 12L15 13.5h7.5L24 15v7.5L22.5 24H15l-1.5-1.5V15z" fill="currentColor"/></svg>` },
] as const;

const BOTTOM_ICONS = [
  { id: "copilot", label: "Copilot (Ctrl+Shift+I)", svg: `<svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l1.7 4.3L14 7l-4.3 1.7L8 13l-1.7-4.3L2 7l4.3-1.7L8 1z"/></svg>` },
  { id: "accounts", label: "Accounts", svg: `<svg width="24" height="24" viewBox="0 0 16 16" fill="none"><path d="M16 7.992C16 3.58 12.416 0 8 0S0 3.58 0 7.992c0 2.43 1.104 4.612 2.832 6.088.016.016.032.016.032.032.144.112.288.224.448.336.08.048.144.111.224.175A7.98 7.98 0 008.016 16a7.98 7.98 0 004.48-1.377c.08-.048.144-.111.224-.16.144-.128.304-.224.448-.336.016-.016.032-.016.032-.032A7.995 7.995 0 0016 7.992zm-8 6.513a6.493 6.493 0 01-3.6-1.09 4 4 0 017.2 0 6.493 6.493 0 01-3.6 1.09zM5.5 7a2.5 2.5 0 015 0 2.5 2.5 0 01-5 0zm8.065 5.408a5.493 5.493 0 00-3.214-2.688A4.001 4.001 0 008 3.5a4 4 0 00-2.35 6.22 5.494 5.494 0 00-3.214 2.688A6.491 6.491 0 011.5 7.992 6.494 6.494 0 018 1.5a6.494 6.494 0 016.5 6.492 6.49 6.49 0 01-1.935 4.416z" fill="currentColor"/></svg>` },
  { id: "settings-gear", label: "Manage", svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M19.85 8.75l4.15.83v4.84l-4.15.83 2.35 3.52-3.42 3.42-3.52-2.35-.83 4.16H9.58l-.84-4.15-3.52 2.35-3.42-3.43 2.35-3.52L0 12.42V7.58l4.15-.84L1.8 3.22 5.22 1.8l3.52 2.35L9.58 0h4.84l.84 4.15 3.52-2.35 3.42 3.42-2.35 3.53zM12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" fill="currentColor"/></svg>` },
] as const;

// ── Types ────────────────────────────────────────────────────
export interface ActivityBarProps {
  eventBus: { emit(ev: string, payload: unknown): void; on(ev: string, fn: (p: unknown) => void): void; off(ev: string, fn: (p: unknown) => void): void };
  authApi?: { isAuthenticated(): boolean; getSession(): { user?: { name?: string; email?: string } } | null; login(provider: string): Promise<void>; logout(): void };
}

// ── Activity Button ──────────────────────────────────────────
function ActivityButton({ id, label, svg, isActive, onClick }: {
  id: string; label: string; svg: string; isActive: boolean;
  onClick: (e: ReactMouseEvent<HTMLDivElement>) => void;
}) {
  const { tokens: t } = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="vsc-activity-btn"
      title={label}
      data-id={id}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: isActive ? t.activeIcon : t.inactiveIcon,
        borderLeft: `2px solid ${isActive ? t.fgBright : "transparent"}`,
        boxSizing: "border-box", position: "relative",
        background: hovered ? "rgba(255,255,255,0.08)" : "transparent",
      }}
      dangerouslySetInnerHTML={{ __html: svg.replace(/<svg /, '<svg style="width:22px;height:22px;" ') }}
    />
  );
}

// ── Accounts Popup ───────────────────────────────────────────
function AccountsPopup({ authApi, eventBus, anchorRect, onClose }: {
  authApi?: ActivityBarProps["authApi"];
  eventBus: ActivityBarProps["eventBus"];
  anchorRect: DOMRect;
  onClose: () => void;
}) {
  const { tokens: t } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handler); };
  }, [onClose]);

  const isLoggedIn = authApi?.isAuthenticated() ?? false;
  const session = authApi?.getSession();
  const user = session?.user;

  const notify = (type: string, message: string) => {
    eventBus.emit(NotificationEvents.Show, { type, message, duration: 3000 });
  };

  const popupStyle: CSSProperties = {
    position: "fixed", left: anchorRect.right + 6,
    bottom: window.innerHeight - anchorRect.bottom,
    width: 280, background: t.menuBg, border: `1px solid ${t.border}`,
    borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
    zIndex: 9999, padding: "8px 0", fontSize: 13,
  };

  return createPortal(
    <div ref={ref} style={popupStyle}>
      {isLoggedIn && user ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${t.border}` }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: t.accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 600, fontSize: 14, flexShrink: 0,
            }}>
              {(user.name || "U").charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: t.fg, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name || "User"}</div>
              <div style={{ color: t.fgDim, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email || ""}</div>
            </div>
          </div>
          <SyncToggle eventBus={eventBus} />
          <PopupItem label="Manage Account" onClick={() => { onClose(); notify("info", "Opening account management..."); }} />
          <PopupItem label="Sign Out" onClick={() => { onClose(); authApi?.logout(); notify("info", "Signed out successfully."); }} />
        </>
      ) : (
        <>
          <div style={{ padding: "10px 14px", color: t.fgDim, fontSize: 12, borderBottom: `1px solid ${t.border}` }}>
            Sign in to sync settings &amp; extensions
          </div>
          <PopupItem label="Sign in with GitHub" onClick={() => {
            onClose();
            if (authApi) {
              authApi.login("github").catch((err: Error) => notify("error", `Sign-in failed: ${err.message}`));
              notify("info", "Opening GitHub sign-in...");
            } else notify("error", "Auth module not available.");
          }} />
          <PopupItem label="Sign in with Google" onClick={() => {
            onClose();
            if (authApi) {
              authApi.login("google").catch((err: Error) => notify("error", `Sign-in failed: ${err.message}`));
              notify("info", "Opening Google sign-in...");
            } else notify("error", "Auth module not available.");
          }} />
        </>
      )}
    </div>,
    document.body,
  );
}

function SyncToggle({ eventBus }: { eventBus: ActivityBarProps["eventBus"] }) {
  const { tokens: t } = useTheme();
  const [isOn, setIsOn] = useState(() => localStorage.getItem("monaco-vanced-sync") === "true");

  const toggle = () => {
    const next = !isOn;
    setIsOn(next);
    localStorage.setItem("monaco-vanced-sync", String(next));
    eventBus.emit(NotificationEvents.Show, { type: "info", message: next ? "Settings Sync enabled" : "Settings Sync disabled", duration: 3000 });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderBottom: `1px solid ${t.border}` }}>
      <div style={{ color: t.fg, fontSize: 12 }}>Settings Sync</div>
      <div
        onClick={toggle}
        style={{
          width: 34, height: 18, borderRadius: 9, cursor: "pointer", position: "relative",
          transition: "background .2s", background: isOn ? t.accent : t.inputBorder,
        }}
      >
        <div style={{
          width: 14, height: 14, borderRadius: "50%", background: "#fff",
          position: "absolute", top: 2, transition: "left .2s", left: isOn ? 18 : 2,
        }} />
      </div>
    </div>
  );
}

function PopupItem({ label, onClick }: { label: string; onClick: () => void }) {
  const { tokens: t } = useTheme();
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ padding: "6px 14px", cursor: "pointer", color: t.fg, background: hovered ? t.listHover : "transparent", transition: "background .1s" }}
    >
      {label}
    </div>
  );
}

// ── Main ActivityBar Component (top icons) ───────────────────
export function ActivityBar({ eventBus, authApi }: ActivityBarProps) {
  const [activeId, setActiveId] = useState("explorer");

  const handleClick = useCallback((id: string) => {
    if (activeId === id) {
      eventBus.emit(SidebarEvents.Toggle, {});
    } else {
      setActiveId(id);
      eventBus.emit(SidebarEvents.ViewActivate, { viewId: id });
    }
  }, [activeId, eventBus]);

  // Listen for external view activation
  useEffect(() => {
    const onActivate = (p: unknown) => {
      const { viewId } = p as { viewId: string };
      setActiveId(viewId);
    };
    eventBus.on(SidebarEvents.ViewActivate, onActivate);
    return () => { eventBus.off(SidebarEvents.ViewActivate, onActivate); };
  }, [eventBus]);

  return (
    <>
      {ICONS.map((icon) => (
        <ActivityButton
          key={icon.id}
          id={icon.id}
          label={icon.label}
          svg={icon.svg}
          isActive={icon.id === activeId}
          onClick={() => handleClick(icon.id)}
        />
      ))}
    </>
  );
}

// ── Bottom icons (accounts + settings gear) ──────────────────
export function ActivityBarBottom({ eventBus, authApi }: ActivityBarProps) {
  const [accountsAnchor, setAccountsAnchor] = useState<DOMRect | null>(null);

  return (
    <>
      {BOTTOM_ICONS.map((icon) => (
        <ActivityButton
          key={icon.id}
          id={icon.id}
          label={icon.label}
          svg={icon.svg}
          isActive={false}
          onClick={(e) => {
            if (icon.id === "settings-gear") {
              eventBus.emit(SettingsEvents.UIOpen, {});
            } else if (icon.id === "accounts") {
              setAccountsAnchor(e.currentTarget.getBoundingClientRect());
            } else if (icon.id === "copilot") {
              eventBus.emit("copilot:toggle" as string, {});
            }
          }}
        />
      ))}
      {accountsAnchor && (
        <AccountsPopup
          authApi={authApi}
          eventBus={eventBus}
          anchorRect={accountsAnchor}
          onClose={() => setAccountsAnchor(null)}
        />
      )}
    </>
  );
}
