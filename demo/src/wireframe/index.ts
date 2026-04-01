// ── Wireframe entry — mounts plugin-driven IDE chrome ───────

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { WireframeAPIs, VirtualFile } from "./types";
import type { MockFsAPI } from "../mock-fs";
import type { SidebarExtras } from "./layout/sidebar/index";
import { FileEvents, SettingsEvents, TabEvents, WelcomeEvents, TitlebarEvents } from "@enjoys/monaco-vanced/core/events";

// Layout
import { buildReactShell, unmountReactShell } from "../components/mount";
import { wireSidebarVisibility } from "./layout/sidebar-visibility";
import { wireSidebar, wireResizeHandle } from "./layout/sidebar/index";

// Panels

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
    eventBus.emit(TitlebarEvents.Update, { fileName: "Welcome" });
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
  const dom = buildReactShell(root, eventBus, {
    authApi: extras?.authApi,
    commandApi: apis.command,
    statusbarApi: apis.statusbar,
    contextMenuApi: apis.contextMenu,
    aiApi: extras?.aiApi,
    indexerApi: extras?.indexerApi,
    files,
  });
  const disposers: (() => void)[] = [];
  const on = (ev: string, fn: (p: unknown) => void) => {
    eventBus.on(ev, fn);
    disposers.push(() => eventBus.off(ev, fn));
  };

  wireSidebarVisibility(dom, on);
  wireSidebar(dom, apis, eventBus, on, files, mockFs, extras);

  wireReactPanelVisibility(dom, eventBus, on, files);

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
    destroy: () => { disposers.forEach((d) => d()); unmountReactShell(); dom.root.innerHTML = ""; },
  };
}
