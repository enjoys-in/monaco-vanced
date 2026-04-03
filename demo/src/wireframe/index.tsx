// ── Wireframe entry — mounts plugin-driven IDE chrome ───────

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { WireframeAPIs, VirtualFile } from "./types";
import type { MockFsAPI } from "../mock-fs";
import type { SidebarExtras } from "./layout/sidebar/index";
import { FileEvents, SettingsEvents, TabEvents, WelcomeEvents, TitlebarEvents, MarketplaceEvents } from "@enjoys/monaco-vanced/core/events";

// Layout
import { buildReactShell, unmountReactShell } from "../components/mount";
import { wireSidebarVisibility } from "./layout/sidebar-visibility";
import { wireSidebar, wireResizeHandle } from "./layout/sidebar/index";
import { createRoot, type Root } from "react-dom/client";
import { ThemeProvider } from "../components/theme";
import { ExtDetailView } from "../components/ext-detail";

export type { WireframeAPIs, VirtualFile } from "./types";

export type { SidebarExtras as WireframeExtras } from "./layout/sidebar/index";

// ── Settings URI constant for tab integration ────────────────
const SETTINGS_URI = "__settings__";
const EXT_DETAIL_URI = "__ext-detail__";

// ── Extension detail webview tab management ──────────────────
// Tracks whether the user has interacted with the current ext detail.
// If not interacted → replace the webview content (reuse the tab).
// If interacted → open a new tab alongside.
interface ExtWebviewTab {
  id: string;
  name: string;
  interacted: boolean;
  root: Root;
  container: HTMLElement;
}

function createExtWebviewManager(
  parentEl: HTMLElement,
  eventBus: InstanceType<typeof EventBus>,
  vsixApi?: import("@enjoys/monaco-vanced/extensions/vsix-module").VSIXModuleAPI,
) {
  let tabs: ExtWebviewTab[] = [];
  let activeTabId: string | null = null;

  function getActiveTab(): ExtWebviewTab | undefined {
    return tabs.find((t) => t.id === activeTabId);
  }

  function showTab(id: string) {
    activeTabId = id;
    for (const tab of tabs) {
      tab.container.style.display = tab.id === id ? "flex" : "none";
    }
  }

  function createTab(ext: { id: string; name: string }): ExtWebviewTab {
    const container = document.createElement("div");
    container.style.cssText = "flex:1;display:flex;flex-direction:column;overflow:hidden;";
    parentEl.appendChild(container);
    const root = createRoot(container);

    const tab: ExtWebviewTab = {
      id: ext.id,
      name: ext.name,
      interacted: false,
      root,
      container,
    };

    root.render(
      <ThemeProvider eventBus={eventBus}>
        <ExtDetailView
          extId={ext.id}
          extName={ext.name}
          eventBus={eventBus}
          onInteract={() => { tab.interacted = true; }}
          vsixApi={vsixApi}
        />
      </ThemeProvider>,
    );

    return tab;
  }

  function openExtDetail(ext: { id: string; name: string }) {
    const active = getActiveTab();

    // Already viewing this extension
    if (active && active.id === ext.id) return;

    // If active tab exists and user hasn't interacted → replace it
    if (active && !active.interacted) {
      active.root.unmount();
      active.container.remove();
      tabs = tabs.filter((t) => t.id !== active.id);
    }

    // Check if this extension already has a tab
    const existing = tabs.find((t) => t.id === ext.id);
    if (existing) {
      showTab(existing.id);
      return;
    }

    // Create new tab
    const newTab = createTab(ext);
    tabs.push(newTab);
    showTab(newTab.id);
  }

  function switchTo(extId: string) {
    const tab = tabs.find((t) => t.id === extId);
    if (tab) showTab(tab.id);
  }

  function dispose() {
    for (const tab of tabs) {
      tab.root.unmount();
      tab.container.remove();
    }
    tabs = [];
    activeTabId = null;
  }

  return { openExtDetail, switchTo, dispose, getActiveTabId: () => activeTabId };
}

// ── React panel visibility wiring (show/hide containers) ─────
function wireReactPanelVisibility(
  dom: import("./types").DOMRefs,
  eventBus: InstanceType<typeof import("@enjoys/monaco-vanced/core/event-bus").EventBus>,
  on: (ev: string, fn: (p: unknown) => void) => void,
  _files: VirtualFile[],
  vsixApi?: import("@enjoys/monaco-vanced/extensions/vsix-module").VSIXModuleAPI,
) {
  let settingsOpen = false;
  let welcomeVisible = true;
  let extDetailOpen = false;

  const extManager = createExtWebviewManager(dom.extensionDetailWebview, eventBus, vsixApi);

  function showWelcome() {
    welcomeVisible = true;
    dom.welcomePage.style.display = "flex";
    dom.editorContainer.style.display = "none";
    dom.settingsWebview.style.display = "none";
    dom.extensionDetailWebview.style.display = "none";
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
    dom.tabBar.style.display = "flex";
    dom.breadcrumbBar.style.display = "flex";
  }

  function openSettings() {
    settingsOpen = true;
    if (extDetailOpen) closeExtDetail();
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
    dom.breadcrumbBar.style.display = "flex";
  }

  function openExtDetail(ext: { id: string; name: string }) {
    extDetailOpen = true;
    if (settingsOpen) closeSettings();
    hideWelcome();
    dom.extensionDetailWebview.style.display = "flex";
    dom.editorContainer.style.display = "none";
    dom.breadcrumbBar.style.display = "none";

    extManager.openExtDetail(ext);

    const uri = `${EXT_DETAIL_URI}:${ext.id}`;
    const label = ext.name ? `Extension: ${ext.name}` : "Extension Details";
    eventBus.emit(TabEvents.OpenSpecial, { uri, label });
  }

  function closeExtDetail() {
    if (!extDetailOpen) return;
    extDetailOpen = false;
    dom.extensionDetailWebview.style.display = "none";
    dom.editorContainer.style.display = "";
    dom.breadcrumbBar.style.display = "flex";
  }

  // Show welcome on startup
  showWelcome();

  on(FileEvents.Open, (p) => {
    const { uri } = p as { uri: string };
    if (uri !== SETTINGS_URI && !uri.startsWith(EXT_DETAIL_URI)) {
      hideWelcome();
      if (settingsOpen) closeSettings();
      if (extDetailOpen) closeExtDetail();
    }
  });

  on(SettingsEvents.UIOpen, () => {
    hideWelcome();
    openSettings();
  });

  on(MarketplaceEvents.OpenDetail, (p) => {
    const ext = p as { id: string; name: string };
    openExtDetail(ext);
  });

  on(TabEvents.SwitchSpecial, (p) => {
    const { uri } = p as { uri: string };
    if (uri === SETTINGS_URI) {
      openSettings();
    } else if (uri.startsWith(EXT_DETAIL_URI)) {
      extDetailOpen = true;
      if (settingsOpen) closeSettings();
      hideWelcome();
      dom.extensionDetailWebview.style.display = "flex";
      dom.editorContainer.style.display = "none";
      dom.breadcrumbBar.style.display = "none";
      // Switch to the specific ext tab
      const extId = uri.replace(`${EXT_DETAIL_URI}:`, "");
      if (extId) extManager.switchTo(extId);
    }
  });

  on(WelcomeEvents.Show, () => {
    if (settingsOpen) closeSettings();
    if (extDetailOpen) closeExtDetail();
    showWelcome();
  });

  return { disposeExtManager: () => extManager.dispose() };
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
    iconApi: extras?.iconApi,
    layoutApi: extras?.layoutApi,
    files,
  });
  const disposers: (() => void)[] = [];
  const on = (ev: string, fn: (p: unknown) => void) => {
    eventBus.on(ev, fn);
    disposers.push(() => eventBus.off(ev, fn));
  };

  wireSidebarVisibility(dom, on);
  wireSidebar(dom, apis, eventBus, on, files, mockFs, extras);

  const { disposeExtManager } = wireReactPanelVisibility(dom, eventBus, on, files, extras?.vsixApi);

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
    destroy: () => { disposeExtManager(); disposers.forEach((d) => d()); unmountReactShell(); dom.root.innerHTML = ""; },
  };
}
