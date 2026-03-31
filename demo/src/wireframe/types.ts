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
  titleBar: HTMLElement;
  titleText: HTMLElement;
  titleCenter: HTMLElement;
  titleActions: HTMLElement;
  activityBar: HTMLElement;
  sidebarContainer: HTMLElement;
  sidebarHeader: HTMLElement;
  sidebarContent: HTMLElement;
  tabBar: HTMLElement;
  editorContainer: HTMLElement;
  bottomPanel: HTMLElement;
  bottomPanelHeader: HTMLElement;
  bottomPanelContent: HTMLElement;
  statusBar: HTMLElement;
  statusLeft: HTMLElement;
  statusRight: HTMLElement;
  toastContainer: HTMLElement;
  contextMenuEl: HTMLElement;
  commandPalette: HTMLElement;
  commandInput: HTMLInputElement;
  commandList: HTMLElement;
}

export type OnHandler = (ev: string, fn: (p: unknown) => void) => void;

// ── Colors (VS Code Dark+ defaults) ────────────────────────
export const C = {
  bg: "#1e1e1e",
  sidebarBg: "#252526",
  activityBg: "#333333",
  titleBg: "#323233",
  tabBg: "#1e1e1e",
  tabActiveBg: "#1e1e1e",
  tabInactiveBg: "#2d2d2d",
  statusBg: "#007acc",
  statusFg: "#ffffff",
  border: "#3c3c3c",
  fg: "#cccccc",
  fgDim: "#858585",
  fgBright: "#ffffff",
  accent: "#007acc",
  hover: "#2a2d2e",
  activeIcon: "#ffffff",
  inactiveIcon: "#858585",
  notification: { info: "#007acc", success: "#16825d", warning: "#c8a400", error: "#f14c4c" },
} as const;
