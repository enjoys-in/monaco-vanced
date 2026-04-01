// ── Wireframe entry — mounts plugin-driven IDE chrome ───────

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { WireframeAPIs, VirtualFile } from "./types";
import type { MockFsAPI } from "../mock-fs";
import type { SidebarExtras } from "./layout/sidebar/index";
import { FileEvents, SettingsEvents, TabEvents, WelcomeEvents } from "@enjoys/monaco-vanced/core/events";

// Layout
import { buildShell } from "./layout/shell";
import { wireActivityBar } from "./layout/activity-bar";
import { wireSidebar, wireResizeHandle } from "./layout/sidebar/index";
import { wireTabs } from "./layout/tabs";
import { wireTitleBar, wireStatusBar } from "./layout/bars";

// Panels
import { wireNotifications } from "./panels/notifications";
import { wireContextMenu, wireCommandPalette, wireBottomPanel } from "./panels/overlays";
import { wireSettingsWebview } from "./panels/settings-webview";
import { wireWelcomePage } from "./panels/welcome-page";

export type { WireframeAPIs, VirtualFile } from "./types";

export type { SidebarExtras as WireframeExtras } from "./layout/sidebar/index";

// ── Settings URI constant for tab integration ────────────────
const SETTINGS_URI = "__settings__";

// ── React panel visibility wiring (show/hide containers) ─────
function wireReactPanelVisibility(
  dom: import("./types").DOMRefs,
  eventBus: InstanceType<typeof import("@enjoys/monaco-vanced/core/event-bus").EventBus>,
  on: (ev: string, fn: (p: unknown) => void) => void,
  files: VirtualFile[],
) {
  let settingsOpen = false;
  let welcomeVisible = true;

  function showWelcome() {
    welcomeVisible = true;
    dom.welcomePage.style.display = "flex";
    dom.editorContainer.style.display = "none";
    dom.settingsWebview.style.display = "none";
    dom.tabBar.style.display = "none";
    dom.breadcrumbBar.style.display = "none";
    dom.titleCenter.textContent = "Welcome";
    document.title = "Welcome — Monaco Vanced";
  }

  function hideWelcome() {
    if (!welcomeVisible) return;
    welcomeVisible = false;
    dom.welcomePage.style.display = "none";
    dom.editorContainer.style.display = "";
    dom.tabBar.style.display = "";
    dom.breadcrumbBar.style.display = "";
  }

  function openSettings() {
    settingsOpen = true;
    dom.settingsWebview.style.display = "flex";
    dom.editorContainer.style.display = "none";
    dom.welcomePage.style.display = "none";
    dom.breadcrumbBar.style.display = "none";
    eventBus.emit(TabEvents.OpenSpecial, { uri: SETTINGS_URI, label: "Settings" });
  }

  function closeSettings() {
    if (!settingsOpen) return;
    settingsOpen = false;
    dom.settingsWebview.style.display = "none";
    dom.editorContainer.style.display = "";
    dom.breadcrumbBar.style.display = "";
  }

  // Show welcome on startup
  showWelcome();

  on(FileEvents.Open, (p) => {
    const { uri } = p as { uri: string };
    if (uri !== SETTINGS_URI) {
      hideWelcome();
      if (settingsOpen) closeSettings();
    }
  });

  on(SettingsEvents.UIOpen, () => {
    hideWelcome();
    openSettings();
  });

  on(TabEvents.SwitchSpecial, (p) => {
    const { uri } = p as { uri: string };
    if (uri === SETTINGS_URI) openSettings();
  });

  on(WelcomeEvents.Show, () => {
    if (settingsOpen) closeSettings();
    showWelcome();
  });
}

export function mountWireframe(
  root: HTMLElement,
  apis: WireframeAPIs,
  eventBus: InstanceType<typeof EventBus>,
  files: VirtualFile[],
  mockFs?: MockFsAPI,
  extras?: SidebarExtras,
  options?: { useReactPanels?: boolean; useReactTabs?: boolean },
): {
  editorContainer: HTMLElement;
  settingsEl: HTMLElement;
  welcomeEl: HTMLElement;
  tabListEl: HTMLElement;
  breadcrumbEl: HTMLElement;
  titleCenterEl: HTMLElement;
  activityBarEl: HTMLElement;
  statusBarEl: HTMLElement;
  sidebarEl: HTMLElement;
  destroy: () => void;
} {
  const dom = buildShell(root);
  const disposers: (() => void)[] = [];
  const on = (ev: string, fn: (p: unknown) => void) => {
    eventBus.on(ev, fn);
    disposers.push(() => eventBus.off(ev, fn));
  };

  wireActivityBar(dom, apis, eventBus, on, extras);
  wireSidebar(dom, apis, eventBus, on, files, mockFs, extras);

  // Skip vanilla tabs when React tabs are used
  if (!options?.useReactTabs) {
    wireTabs(dom, eventBus, on, files, extras?.iconApi);
  }

  wireTitleBar(dom, apis, eventBus, on);
  wireStatusBar(dom, apis, on);
  wireBottomPanel(dom, eventBus, on, files);
  wireNotifications(dom, apis, on);
  wireContextMenu(dom, apis, on);
  wireCommandPalette(dom, apis, on);

  if (options?.useReactPanels) {
    // React handles settings & welcome — just wire show/hide
    wireReactPanelVisibility(dom, eventBus, on, files);
  } else {
    wireSettingsWebview(dom, apis, eventBus, on);
    wireWelcomePage(dom, eventBus, on, files);
  }

  wireResizeHandle(dom);

  return {
    editorContainer: dom.editorContainer,
    settingsEl: dom.settingsWebview,
    welcomeEl: dom.welcomePage,
    tabListEl: dom.tabList,
    breadcrumbEl: dom.breadcrumbBar,
    titleCenterEl: dom.titleCenter,
    activityBarEl: dom.activityBar,
    statusBarEl: dom.statusBar,
    sidebarEl: dom.sidebarContainer,
    destroy: () => { disposers.forEach((d) => d()); dom.root.innerHTML = ""; },
  };
}
