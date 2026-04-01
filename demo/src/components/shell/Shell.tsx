// ── React Shell — full IDE chrome layout ─────────────────────

import { useRef, useCallback, useImperativeHandle, forwardRef, type CSSProperties } from "react";
import { CV } from "../theme";
import type { DOMRefs } from "../../wireframe/types";

// ── Styles (CSS custom properties for live theming) ──────────
const S = {
  root: {
    display: "flex", flexDirection: "column", height: "100%", width: "100%",
    overflow: "hidden", background: CV.bg, color: CV.fg,
    fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    fontSize: 13, WebkitFontSmoothing: "antialiased",
  } as CSSProperties,

  titleBar: {
    display: "flex", alignItems: "center", height: 30, minHeight: 30,
    background: CV.titleBg, padding: 0,
    WebkitAppRegion: "drag", userSelect: "none",
    borderBottom: `1px solid ${CV.border}`,
    backdropFilter: "saturate(180%) blur(20px)",
  } as CSSProperties,

  titleMenuBar: {
    display: "flex", alignItems: "center", gap: 0,
    WebkitAppRegion: "no-drag", padding: "0 4px 0 8px",
  } as CSSProperties,

  titleText: {
    fontSize: 11, color: CV.fgDim,
    WebkitAppRegion: "no-drag", padding: "0 4px", whiteSpace: "nowrap",
  } as CSSProperties,

  titleCenter: {
    flex: 1, display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden",
  } as CSSProperties,

  titleCenterLabel: {
    fontSize: 11, color: CV.fgDim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  } as CSSProperties,

  titleActions: {
    display: "flex", gap: 2, alignItems: "center",
    WebkitAppRegion: "no-drag", paddingRight: 8,
  } as CSSProperties,

  mainArea: { display: "flex", flex: 1, overflow: "hidden" } as CSSProperties,

  activityBar: {
    display: "flex", flexDirection: "column", width: 48, minWidth: 48,
    background: CV.activityBg, borderRight: `1px solid ${CV.border}`,
    alignItems: "center", paddingTop: 0, justifyContent: "space-between",
  } as CSSProperties,

  activityTop: { display: "flex", flexDirection: "column", alignItems: "center", width: "100%" } as CSSProperties,
  activityBottom: { display: "flex", flexDirection: "column", alignItems: "center", width: "100%", paddingBottom: 4 } as CSSProperties,

  sidebar: {
    display: "flex", flexDirection: "column", width: 240, minWidth: 170,
    background: CV.sidebarBg, borderRight: `1px solid ${CV.border}`,
    overflow: "hidden", position: "relative",
  } as CSSProperties,

  sidebarHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    height: 35, minHeight: 35, padding: "0 12px 0 20px",
    textTransform: "uppercase", fontSize: 11, fontWeight: 600,
    letterSpacing: "0.5px", color: CV.fgDim,
  } as CSSProperties,

  sidebarContent: { flex: 1, overflowY: "auto", overflowX: "hidden" } as CSSProperties,

  editorPanel: { display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" } as CSSProperties,

  tabBar: {
    display: "flex", alignItems: "stretch", height: 38, minHeight: 38,
    background: CV.tabInactiveBg, borderBottom: `1px solid ${CV.border}`,
  } as CSSProperties,

  tabList: {
    display: "flex", flex: 1, overflowX: "auto", overflowY: "hidden", alignItems: "stretch",
  } as CSSProperties,

  tabActions: { display: "flex", alignItems: "center", padding: "0 8px", gap: 4 } as CSSProperties,

  breadcrumbBar: {
    display: "flex", alignItems: "center", minHeight: 22, padding: "0 12px",
    background: CV.editorBg, fontSize: 12, color: CV.breadcrumbFg,
    gap: 4, borderBottom: `1px solid ${CV.border}`,
  } as CSSProperties,

  editorContainer: { flex: 1, overflow: "hidden" } as CSSProperties,

  settingsWebview: {
    display: "none", flexDirection: "column", flex: 1, overflow: "hidden", background: CV.editorBg,
  } as CSSProperties,

  welcomePage: {
    display: "none", flexDirection: "column", flex: 1, overflow: "hidden", background: CV.editorBg,
  } as CSSProperties,

  bottomPanel: {
    display: "none", flexDirection: "column", height: 200, minHeight: 100,
    borderTop: `1px solid ${CV.border}`, background: CV.panelBg,
  } as CSSProperties,

  bottomPanelHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    height: 35, minHeight: 35, padding: "0 8px 0 12px",
    background: CV.panelHeaderBg, borderBottom: `1px solid ${CV.border}`,
  } as CSSProperties,

  bottomPanelTabs: { display: "flex", alignItems: "center", gap: 0, height: "100%" } as CSSProperties,
  bottomPanelActions: { display: "flex", alignItems: "center", gap: 4 } as CSSProperties,

  bottomPanelContent: {
    flex: 1, overflow: "auto", padding: "8px 12px",
    fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: 13,
  } as CSSProperties,

  statusBar: {
    display: "flex", alignItems: "center", height: 22, minHeight: 22,
    background: CV.statusBg, color: CV.statusFg, fontSize: 12,
    padding: "0 8px", userSelect: "none",
  } as CSSProperties,

  statusLeft: { display: "flex", alignItems: "center", gap: 0, height: "100%" } as CSSProperties,
  statusRight: { display: "flex", alignItems: "center", gap: 0, marginLeft: "auto", height: "100%" } as CSSProperties,

  toastContainer: {
    position: "fixed", bottom: 28, right: 12,
    display: "flex", flexDirection: "column-reverse", gap: 6,
    zIndex: 10000, pointerEvents: "none",
  } as CSSProperties,

  contextMenu: { position: "fixed", display: "none", zIndex: 9999 } as CSSProperties,

  commandPalette: {
    position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
    width: 600, maxWidth: "80vw", display: "none", flexDirection: "column",
    zIndex: 9998, marginTop: 0, background: CV.menuBg,
    border: `1px solid ${CV.borderLight}`, borderTop: "none",
    borderRadius: "0 0 8px 8px", boxShadow: "0 8px 40px rgba(0,0,0,0.55)",
    overflow: "hidden",
  } as CSSProperties,

  commandInput: {
    width: "100%", padding: "8px 14px", background: CV.inputBg,
    border: "none", borderBottom: `1px solid ${CV.border}`,
    borderRadius: 0, fontSize: 13, boxSizing: "border-box",
  } as CSSProperties,
} as const;

// Header action button icons
const HEADER_BTNS = [
  { key: "commandPalette", title: "Command Palette (Ctrl+Shift+P)", svg: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M10.68 11.74a6 6 0 01-7.922-8.982 6 6 0 018.982 7.922l3.04 3.04a.749.749 0 01-.326 1.275.749.749 0 01-.734-.215l-3.04-3.04zM11.5 7a4.499 4.499 0 10-8.997 0A4.499 4.499 0 0011.5 7z"/></svg>` },
  { key: "togglePanel", title: "Toggle Panel (Ctrl+J)", svg: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1h12l.5.5v13l-.5.5H2l-.5-.5v-13L2 1zm0 1v4h12V2H2zm0 5v7h12V7H2z"/></svg>` },
  { key: "toggleSidebar", title: "Toggle Sidebar (Ctrl+B)", svg: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1h12l.5.5v13l-.5.5H2l-.5-.5v-13L2 1zm0 1v12h3V2H2zm4 0v12h8V2H6z"/></svg>` },
  { key: "openSettings", title: "Settings", svg: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M9.1 4.4L8.6 2H7.4l-.5 2.4-.7.3-2-1.3-.9.8 1.3 2-.3.7-2.4.5v1.2l2.4.5.3.7-1.3 2 .8.8 2-1.3.7.3.5 2.4h1.2l.5-2.4.7-.3 2 1.3.9-.8-1.3-2 .3-.7 2.4-.5V6.8l-2.4-.5-.3-.7 1.3-2-.8-.8-2 1.3-.7-.3zM9.4 1l.5 2.4L12 2.1l2 2-1.4 2.1 2.4.4v2.8l-2.4.5L14 12l-2 2-2.1-1.4-.5 2.4H6.6l-.5-2.4L4 14l-2-2 1.4-2.1L1 9.4V6.6l2.4-.5L2 4l2-2 2.1 1.4L6.6 1h2.8zM8 11a3 3 0 100-6 3 3 0 000 6zm0-1a2 2 0 110-4 2 2 0 010 4z"/></svg>` },
] as const;

function HeaderBtn({ title, svg, action }: { title: string; svg: string; action: string }) {
  return (
    <div
      title={title}
      data-action={action}
      style={{
        width: 28, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: CV.fgDim, borderRadius: 4, transition: "background .1s, color .1s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = CV.fg; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = CV.fgDim; }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// ── Shell component ──────────────────────────────────────────
export interface ShellHandle {
  getDOMRefs(): DOMRefs;
}

export const Shell = forwardRef<ShellHandle, { rootEl: HTMLElement }>(function Shell({ rootEl }, ref) {
  // Refs for every element that wiring code needs
  const refs = useRef<Partial<DOMRefs>>({});
  const setRef = useCallback(<K extends keyof DOMRefs>(key: K) => (el: HTMLElement | null) => {
    if (el) refs.current[key] = el as any;
  }, []);

  useImperativeHandle(ref, () => ({
    getDOMRefs(): DOMRefs {
      return {
        root: rootEl,
        titleBar: refs.current.titleBar!,
        titleText: refs.current.titleText!,
        titleCenter: refs.current.titleCenter!,
        titleActions: refs.current.titleActions!,
        titleMenuBar: refs.current.titleMenuBar!,
        activityBar: refs.current.activityBar!,
        activityBottom: refs.current.activityBottom!,
        sidebarContainer: refs.current.sidebarContainer!,
        sidebarHeader: refs.current.sidebarHeader!,
        sidebarToolbar: refs.current.sidebarToolbar!,
        sidebarContent: refs.current.sidebarContent!,
        tabBar: refs.current.tabBar!,
        tabList: refs.current.tabList!,
        tabActions: refs.current.tabActions!,
        editorContainer: refs.current.editorContainer!,
        settingsWebview: refs.current.settingsWebview!,
        welcomePage: refs.current.welcomePage!,
        breadcrumbBar: refs.current.breadcrumbBar!,
        bottomPanel: refs.current.bottomPanel!,
        bottomPanelTabs: refs.current.bottomPanelTabs!,
        bottomPanelContent: refs.current.bottomPanelContent!,
        bottomPanelActions: refs.current.bottomPanelActions!,
        statusBar: refs.current.statusBar!,
        statusLeft: refs.current.statusLeft!,
        statusRight: refs.current.statusRight!,
        sidebarBackdrop: refs.current.sidebarBackdrop!,
        toastContainer: refs.current.toastContainer!,
        contextMenuEl: refs.current.contextMenuEl!,
        commandPalette: refs.current.commandPalette!,
        commandInput: refs.current.commandInput! as HTMLInputElement,
        commandList: refs.current.commandList!,
      };
    },
  }), [rootEl]);

  return (
    <>
      {/* ── Title Bar ── */}
      <div ref={setRef("titleBar")} style={S.titleBar}>
        <div ref={setRef("titleMenuBar")} className="vsc-title-menu" style={S.titleMenuBar} />
        <span ref={setRef("titleText")} className="vsc-title-text" style={S.titleText}>
          Monaco Vanced
        </span>
        <div style={S.titleCenter}>
          <span ref={setRef("titleCenter")} style={S.titleCenterLabel} />
        </div>
        <div ref={setRef("titleActions")} className="vsc-title-actions" style={S.titleActions}>
          {HEADER_BTNS.map((b) => (
            <HeaderBtn key={b.key} title={b.title} svg={b.svg} action={b.key} />
          ))}
        </div>
      </div>

      {/* ── Main Area ── */}
      <div style={S.mainArea}>
        {/* Activity Bar */}
        <div className="vsc-activity-bar" style={S.activityBar}>
          <div ref={setRef("activityBar")} style={S.activityTop} />
          <div ref={setRef("activityBottom")} style={S.activityBottom} />
        </div>

        {/* Sidebar */}
        <div ref={setRef("sidebarContainer")} className="vsc-sidebar" style={S.sidebar}>
          <div style={S.sidebarHeader}>
            <span ref={setRef("sidebarHeader")}>Explorer</span>
            <div ref={setRef("sidebarToolbar")} style={{ display: "flex", alignItems: "center", gap: 2 }} />
          </div>
          <div ref={setRef("sidebarContent")} className="vsc-sidebar-content" style={S.sidebarContent} />
        </div>

        {/* Editor Panel */}
        <div style={S.editorPanel}>
          {/* Tab Bar */}
          <div ref={setRef("tabBar")} style={S.tabBar}>
            <div ref={setRef("tabList")} className="vsc-tab-bar" style={S.tabList} />
            <div ref={setRef("tabActions")} style={S.tabActions} />
          </div>

          {/* Breadcrumbs */}
          <div ref={setRef("breadcrumbBar")} className="vsc-breadcrumb-bar" style={S.breadcrumbBar} />

          {/* Editor */}
          <div ref={setRef("editorContainer")} id="editor-container" style={S.editorContainer} />

          {/* Settings Webview */}
          <div ref={setRef("settingsWebview")} style={S.settingsWebview} />

          {/* Welcome Page */}
          <div ref={setRef("welcomePage")} style={S.welcomePage} />

          {/* Bottom Panel */}
          <div ref={setRef("bottomPanel")} className="vsc-bottom-panel" style={S.bottomPanel}>
            <div style={S.bottomPanelHeader}>
              <div ref={setRef("bottomPanelTabs")} style={S.bottomPanelTabs} />
              <div ref={setRef("bottomPanelActions")} style={S.bottomPanelActions} />
            </div>
            <div ref={setRef("bottomPanelContent")} style={S.bottomPanelContent} />
          </div>
        </div>
      </div>

      {/* ── Status Bar ── */}
      <div ref={setRef("statusBar")} style={S.statusBar}>
        <div ref={setRef("statusLeft")} style={S.statusLeft} />
        <div ref={setRef("statusRight")} style={S.statusRight} />
      </div>

      {/* ── Overlays ── */}
      <div ref={setRef("sidebarBackdrop")} className="vsc-sidebar-backdrop" />
      <div ref={setRef("toastContainer")} className="vsc-toast-container" style={S.toastContainer} />
      <div ref={setRef("contextMenuEl")} style={S.contextMenu} />
      <div ref={setRef("commandPalette")} className="vsc-command-palette" style={S.commandPalette}>
        <input
          ref={setRef("commandInput") as any}
          type="text"
          placeholder=">"
          className="vsc-input"
          style={S.commandInput}
        />
        <div ref={setRef("commandList")} style={{ maxHeight: 300, overflowY: "auto" }} />
      </div>
    </>
  );
});
