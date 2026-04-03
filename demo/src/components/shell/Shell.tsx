// ── React Shell — full IDE chrome layout ─────────────────────

import { useState, useRef, useCallback, useImperativeHandle, useEffect, forwardRef, type CSSProperties } from "react";
import { CV } from "../theme";
import type { DOMRefs } from "../../wireframe/types";
import { ActivityBar, ActivityBarBottom, type ActivityBarProps } from "../activity-bar/ActivityBar";
import { Notifications } from "../notifications/Notifications";
import { TitleBar, type TitleBarProps } from "../title-bar/TitleBar";
import { StatusBar, type StatusBarProps } from "../status-bar/StatusBar";
import { ContextMenu } from "../context-menu/ContextMenu";
import { CommandPalette } from "../command-palette/CommandPalette";
import { BottomPanel, type BottomPanelLayoutApi } from "../bottom-panel/BottomPanel";
import { AiChat, type AiChatProps } from "../ai-chat/AiChat";
import { WelcomeDialog } from "../dialogs/WelcomeDialog";
import { SplitEditor } from "../editor/SplitEditor";

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
    display: "flex", flexDirection: "column", width: 330, minWidth: 170,
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
    display: "flex", flex: 1, height: "100%", overflowX: "auto", overflowY: "hidden", alignItems: "stretch",
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

  extensionDetailWebview: {
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

// ── Shell component ──────────────────────────────────────────
export interface ShellHandle {
  getDOMRefs(): DOMRefs;
}

export const Shell = forwardRef<ShellHandle, {
  rootEl: HTMLElement;
  eventBus: ActivityBarProps["eventBus"];
  authApi?: ActivityBarProps["authApi"];
  commandApi?: TitleBarProps["commandApi"];
  statusbarApi?: StatusBarProps["statusbarApi"];
  contextMenuApi?: { dismiss(): void };
  aiApi?: AiChatProps["aiApi"];
  indexerApi?: AiChatProps["indexerApi"];
  iconApi?: AiChatProps["iconApi"];
  layoutApi?: BottomPanelLayoutApi;
  files?: { uri: string; name: string }[];
}>(function Shell({ rootEl, eventBus, authApi, commandApi, statusbarApi, contextMenuApi, aiApi, indexerApi, iconApi, layoutApi, files }, ref) {
  const [chatVisible, setChatVisible] = useState(false);

  // Listen for copilot toggle from activity bar or command
  useEffect(() => {
    const toggleChat = () => setChatVisible((v) => !v);
    const openChat = () => setChatVisible(true);
    eventBus.on("copilot:toggle", toggleChat);
    eventBus.on("ai:open-chat", openChat);
    return () => {
      eventBus.off("copilot:toggle", toggleChat);
      eventBus.off("ai:open-chat", openChat);
    };
  }, [eventBus]);

  // Refs for every element that wiring code needs
  const refs = useRef<Partial<DOMRefs>>({});
  const setRef = useCallback(<K extends keyof DOMRefs>(key: K) => (el: HTMLElement | null) => {
    if (el) refs.current[key] = el as any;
  }, []);

  // Placeholder elements for refs now managed by React components
  const placeholder = useRef(document.createElement("div"));

  useImperativeHandle(ref, () => ({
    getDOMRefs(): DOMRefs {
      return {
        root: rootEl,
        titleBar: refs.current.titleBar!,
        titleText: placeholder.current,
        titleCenter: placeholder.current,
        titleActions: placeholder.current,
        titleMenuBar: placeholder.current,
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
        extensionDetailWebview: refs.current.extensionDetailWebview!,
        welcomePage: refs.current.welcomePage!,
        breadcrumbBar: refs.current.breadcrumbBar!,
        bottomPanel: placeholder.current,
        bottomPanelTabs: placeholder.current,
        bottomPanelContent: placeholder.current,
        bottomPanelActions: placeholder.current,
        statusBar: refs.current.statusBar!,
        statusLeft: placeholder.current,
        statusRight: placeholder.current,
        sidebarBackdrop: refs.current.sidebarBackdrop!,
        toastContainer: refs.current.toastContainer!,
        contextMenuEl: placeholder.current,
        commandPalette: placeholder.current,
        commandInput: placeholder.current as unknown as HTMLInputElement,
        commandList: placeholder.current,
      };
    },
  }), [rootEl]);

  return (
    <>
      {/* ── Title Bar ── */}
      <div ref={setRef("titleBar")} style={S.titleBar}>
        <TitleBar eventBus={eventBus} commandApi={commandApi} />
      </div>

      {/* ── Main Area ── */}
      <div style={S.mainArea}>
        {/* Activity Bar */}
        <div className="vsc-activity-bar" style={S.activityBar}>
          <div ref={setRef("activityBar")} style={S.activityTop}>
            <ActivityBar eventBus={eventBus} authApi={authApi} />
          </div>
          <div ref={setRef("activityBottom")} style={S.activityBottom}>
            <ActivityBarBottom eventBus={eventBus} authApi={authApi} />
          </div>
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
          <div ref={setRef("editorContainer")} id="editor-container" style={{ ...S.editorContainer, position: "relative" }}>
            <SplitEditor eventBus={eventBus} primaryEditorRef={null} />
          </div>

          {/* Settings Webview */}
          <div ref={setRef("settingsWebview")} style={S.settingsWebview} />

          {/* Extension Detail Webview */}
          <div ref={setRef("extensionDetailWebview")} style={S.extensionDetailWebview} />

          {/* Welcome Page */}
          <div ref={setRef("welcomePage")} style={S.welcomePage} />

          {/* Bottom Panel */}
          <BottomPanel eventBus={eventBus} files={files} layoutApi={layoutApi} />
        </div>

        {/* AI Chat Panel (right side) */}
        {aiApi && (
          <AiChat
            eventBus={eventBus}
            aiApi={aiApi}
            indexerApi={indexerApi}
            iconApi={iconApi}
            visible={chatVisible}
            onClose={() => setChatVisible(false)}
            files={files}
          />
        )}
      </div>

      {/* ── Status Bar ── */}
      <div ref={setRef("statusBar")} style={S.statusBar}>
        <StatusBar eventBus={eventBus} commandApi={commandApi} statusbarApi={statusbarApi} />
      </div>

      {/* ── Overlays ── */}
      <div ref={setRef("sidebarBackdrop")} className="vsc-sidebar-backdrop" />
      <div ref={setRef("toastContainer")} className="vsc-toast-container" style={S.toastContainer}>
        <Notifications eventBus={eventBus} />
      </div>

      {/* Context Menu (portal) */}
      <ContextMenu eventBus={eventBus} commandApi={commandApi} contextMenuApi={contextMenuApi} />

      {/* Command Palette (portal) */}
      <CommandPalette eventBus={eventBus} commandApi={commandApi} editor={window.editor} />

      {/* First-visit welcome dialog */}
      <WelcomeDialog />
    </>
  );
});
