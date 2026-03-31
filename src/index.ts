/**
 * monaco-vanced — Plugin-based IDE built on Monaco Editor
 *
 * This is the main entry point for the npm package.
 * Users import plugins and the core engine from here.
 */

// ── Core Engine ──────────────────────────────────────────────
export { PluginEngine } from "@core/plugin-engine";
export { EventBus } from "@core/event-bus";
export { PluginContext } from "@core/plugin-context";
export { createMonacoIDE } from "@core/facade";
export type { CreateIDEOptions, MonacoVancedInstance } from "@core/facade";

// ── Core Types ───────────────────────────────────────────────
export type {
  MonacoPlugin,
  PluginContext as PluginContextType,
  Monaco,
  MonacoEditor,
  IDisposable,
  BootConfig,
} from "@core/types";

// ── Events ───────────────────────────────────────────────────
export * from "@core/events";

// ── Plugins: Infrastructure ──────────────────────────────────
export { createSettingsPlugin } from "@plugins/infrastructure/settings-module";
export type { SettingsModuleAPI, SettingsConfig, SettingSchema } from "@plugins/infrastructure/settings-module/types";

export { createNotificationPlugin } from "@plugins/infrastructure/notification-module";
export type { NotificationModuleAPI, Notification, NotificationConfig, NotificationType, NotificationAction, NotificationPosition, NotificationHistoryEntry } from "@plugins/infrastructure/notification-module/types";

export { createCommandPlugin } from "@plugins/infrastructure/command-module";
export type { CommandModuleAPI, Command, CommandConfig, ExecutionContext, CommandHistoryEntry } from "@plugins/infrastructure/command-module/types";

export { createKeybindingPlugin } from "@plugins/infrastructure/keybinding-module";
export type { KeybindingModuleAPI, Keybinding, KeybindingConfig, ResolvedKeybinding, KeybindingConflict } from "@plugins/infrastructure/keybinding-module/types";

export { createDialogPlugin } from "@plugins/infrastructure/dialog-module";
export type { DialogModuleAPI, DialogConfig, DialogResult, DialogAction, QuickPickItem, QuickPickOptions } from "@plugins/infrastructure/dialog-module/types";

// ── Plugins: Theming ─────────────────────────────────────────
export { createThemePlugin } from "@plugins/theming/theme-module";
export type { ThemeModuleAPI, ThemeConfig, ThemeDefinition, ThemeIndexEntry } from "@plugins/theming/theme-module/types";

export { createIconPlugin } from "@plugins/theming/icon-module";
export type { IconModuleAPI, IconConfig, IconTheme } from "@plugins/theming/icon-module/types";

// ── Plugins: Layout ──────────────────────────────────────────
export { createLayoutPlugin } from "@plugins/layout/layout-module";
export type { LayoutModuleAPI, LayoutPluginOptions, LayoutState, PanelView } from "@plugins/layout/layout-module/types";

export { createHeaderPlugin } from "@plugins/layout/header-module";
export type { HeaderModuleAPI, HeaderConfig, HeaderState, MenuEntry, UserProfile } from "@plugins/layout/header-module/types";

export { createSidebarPlugin } from "@plugins/layout/sidebar-module";
export type { SidebarModuleAPI, SidebarPluginOptions, SidebarState, SidebarViewConfig } from "@plugins/layout/sidebar-module/types";

export { createStatusbarPlugin } from "@plugins/layout/statusbar-module";
export type { StatusbarModuleAPI, StatusbarItem, StatusbarPluginOptions, StatusbarAlignment } from "@plugins/layout/statusbar-module/types";

export { createTitlePlugin } from "@plugins/layout/title-module";
export type { TitleModuleAPI, TitlePluginOptions, TitleState, BreadcrumbSegment } from "@plugins/layout/title-module/types";

export { createNavigationPlugin } from "@plugins/layout/navigation-module";
export type { NavigationModuleAPI, NavigationPluginOptions, NavigationEntry } from "@plugins/layout/navigation-module/types";

export { createUIPlugin } from "@plugins/layout/ui-module";
export type { UIModuleAPI, UIPluginOptions } from "@plugins/layout/ui-module/types";

export { createContextMenuPlugin } from "@plugins/layout/context-menu-module";
export type { ContextMenuModuleAPI, ContextMenuPluginOptions, MenuItem, MenuContext } from "@plugins/layout/context-menu-module/types";

// ── Plugins: Editor ──────────────────────────────────────────
export { createEditorPlugin } from "@plugins/editor/editor-module";
export type { EditorConfig, ModelState } from "@plugins/editor/editor-module/types";

export { createTabsPlugin } from "@plugins/editor/tabs-module";
export type { TabEntry, TabGroup } from "@plugins/editor/tabs-module/types";
