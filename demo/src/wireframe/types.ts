// ── Wireframe types & constants ─────────────────────────────

import type { HeaderModuleAPI } from "@enjoys/monaco-vanced/layout/header-module";
import type { SidebarModuleAPI } from "@enjoys/monaco-vanced/layout/sidebar-module";
import type { StatusbarModuleAPI } from "@enjoys/monaco-vanced/layout/statusbar-module";
import type { TitleModuleAPI } from "@enjoys/monaco-vanced/layout/title-module";
import type { LayoutModuleAPI } from "@enjoys/monaco-vanced/layout/layout-module";
import type { NotificationModuleAPI } from "@enjoys/monaco-vanced/infrastructure/notification-module";
import type { CommandModuleAPI } from "@enjoys/monaco-vanced/infrastructure/command-module";
import type { ContextMenuModuleAPI } from "@enjoys/monaco-vanced/layout/context-menu-module";
import type { DialogModuleAPI } from "@enjoys/monaco-vanced/infrastructure/dialog-module";

export interface WireframeAPIs {
  header?: HeaderModuleAPI;
  sidebar?: SidebarModuleAPI;
  statusbar?: StatusbarModuleAPI;
  title?: TitleModuleAPI;
  layout?: LayoutModuleAPI;
  notification?: NotificationModuleAPI;
  command?: CommandModuleAPI;
  contextMenu?: ContextMenuModuleAPI;
  dialog?: DialogModuleAPI;
}

export interface DOMRefs {
  root: HTMLElement;
  // Title bar
  titleBar: HTMLElement;
  titleText: HTMLElement;
  titleCenter: HTMLElement;
  titleActions: HTMLElement;
  titleMenuBar: HTMLElement;
  // Activity bar
  activityBar: HTMLElement;
  activityBottom: HTMLElement;
  // Sidebar
  sidebarContainer: HTMLElement;
  sidebarHeader: HTMLElement;
  sidebarToolbar: HTMLElement;
  sidebarContent: HTMLElement;
  // Editor area
  tabBar: HTMLElement;
  tabList: HTMLElement;
  tabActions: HTMLElement;
  editorContainer: HTMLElement;
  settingsWebview: HTMLElement;
  welcomePage: HTMLElement;
  breadcrumbBar: HTMLElement;
  // Bottom panel
  bottomPanel: HTMLElement;
  bottomPanelTabs: HTMLElement;
  bottomPanelContent: HTMLElement;
  bottomPanelActions: HTMLElement;
  // Status bar
  statusBar: HTMLElement;
  statusLeft: HTMLElement;
  statusRight: HTMLElement;
  // Overlays
  sidebarBackdrop: HTMLElement;
  toastContainer: HTMLElement;
  contextMenuEl: HTMLElement;
  commandPalette: HTMLElement;
  commandInput: HTMLInputElement;
  commandList: HTMLElement;
}

export type OnHandler = (ev: string, fn: (p: unknown) => void) => void;

// ── Demo virtual file system ────────────────────────────────
export interface VirtualFile {
  uri: string;
  name: string;
  language: string;
  content: string;
  icon?: string;
}

// ── Colors — CSS custom property references for live theming ─
// Every value is `var(--vsc-*)` so inline styles auto-update
// when CSS custom properties change on :root at theme switch.
const _v = (k: string) => `var(--vsc-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)})`;

export const C = {
  bg: _v("bg"),
  editorBg: _v("editorBg"),
  sidebarBg: _v("sidebarBg"),
  activityBg: _v("activityBg"),
  titleBg: _v("titleBg"),
  menuBg: _v("menuBg"),
  tabBg: _v("tabBg"),
  tabActiveBg: _v("tabActiveBg"),
  tabInactiveBg: _v("tabInactiveBg"),
  statusBg: _v("statusBg"),
  statusFg: _v("statusFg"),
  border: _v("border"),
  borderLight: _v("borderLight"),
  fg: _v("fg"),
  fgDim: _v("fgDim"),
  fgBright: _v("fgBright"),
  accent: _v("accent"),
  accentAlt: _v("accentAlt"),
  hover: _v("hover"),
  listHover: _v("listHover"),
  listActive: _v("listActive"),
  activeIcon: _v("activeIcon"),
  inactiveIcon: _v("inactiveIcon"),
  breadcrumbFg: _v("breadcrumbFg"),
  notification: {
    info: _v("textLink"),
    success: _v("successGreen"),
    warning: _v("warningYellow"),
    error: _v("errorRed"),
  },
  panelBg: _v("panelBg"),
  panelHeaderBg: _v("panelHeaderBg"),
  badgeBg: _v("badgeBg"),
  badgeFg: _v("badgeFg"),
  buttonBg: _v("buttonBg"),
  buttonHoverBg: _v("buttonHoverBg"),
  inputBg: _v("inputBg"),
  inputBorder: _v("inputBorder"),
  focusBorder: _v("focusBorder"),
  cardBg: _v("cardBg"),
  cardBorder: _v("cardBorder"),
  successGreen: _v("successGreen"),
  warningYellow: _v("warningYellow"),
  errorRed: _v("errorRed"),
  textLink: _v("textLink"),
  separator: _v("separator"),
};
