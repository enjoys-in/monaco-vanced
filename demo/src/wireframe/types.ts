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

// ── Colors (VS Code Dark+ defaults) ────────────────────────
export const C = {
  bg: "#1e1e1e",
  editorBg: "#1e1e1e",
  sidebarBg: "#252526",
  activityBg: "#333333",
  titleBg: "#3c3c3c",
  menuBg: "#252526",
  tabBg: "#1e1e1e",
  tabActiveBg: "#1e1e1e",
  tabInactiveBg: "#2d2d2d",
  statusBg: "#007acc",
  statusFg: "#ffffff",
  border: "#3c3c3c",
  borderLight: "#444444",
  fg: "#cccccc",
  fgDim: "#858585",
  fgBright: "#ffffff",
  accent: "#007acc",
  hover: "#2a2d2e",
  listHover: "#2a2d2e",
  listActive: "#04395e",
  activeIcon: "#ffffff",
  inactiveIcon: "#858585",
  breadcrumbFg: "#a9a9a9",
  notification: { info: "#3794ff", success: "#89d185", warning: "#cca700", error: "#f14c4c" },
  panelBg: "#1e1e1e",
  panelHeaderBg: "#252526",
  badgeBg: "#007acc",
  badgeFg: "#ffffff",
  buttonBg: "#0e639c",
  buttonHoverBg: "#1177bb",
} as const;
