// ── Webview Module Types ────────────────────────────────────
// Full webview system: panels, descriptors, options, loading
// indicators, permissions, engine API, and message bridge.

import type { IDisposable, PluginContext } from "@core/types";

// ── Locations ───────────────────────────────────────────────

export type WebviewLocation = "right" | "bottom" | "editor" | "modal";

// ── Message protocol ────────────────────────────────────────

export interface WebviewMessage {
  readonly type: string;
  [key: string]: unknown;
}

// ── Permissions ─────────────────────────────────────────────

export type WebviewPermission =
  | "fs.read"
  | "fs.write"
  | "commands.execute"
  | "settings.read"
  | "settings.write"
  | "notifications"
  | "editor.read"
  | "terminal.run";

// ── Loading config ──────────────────────────────────────────

export interface SpinnerConfig {
  readonly size?: "sm" | "md" | "lg";
  readonly color?: string;
  readonly label?: string;
}

export interface SkeletonConfig {
  readonly rows?: number;
  readonly avatar?: boolean;
  readonly title?: boolean;
  readonly paragraph?: boolean;
  readonly image?: boolean;
  readonly custom?: string;
  readonly animation?: "pulse" | "wave" | "none";
}

export interface ProgressBarConfig {
  readonly indeterminate?: boolean;
  readonly color?: string;
}

export interface WebviewLoadingConfig {
  readonly type?: "spinner" | "skeleton" | "progress" | "custom";
  readonly spinner?: SpinnerConfig;
  readonly skeleton?: SkeletonConfig;
  readonly progress?: ProgressBarConfig;
  readonly html?: string;
  readonly actionIndicator?: "spinner-overlay" | "disable-only" | "custom";
  readonly actionHtml?: string;
  readonly minDisplayMs?: number;
}

// ── Webview panel options (full config for createWebview) ───

export interface WebviewPanelOptions {
  readonly id: string;
  readonly title: string;
  readonly location: WebviewLocation;
  readonly icon?: string;
  readonly html?: string;
  readonly render?: (ctx: WebviewContext) => unknown;
  readonly retainOnHidden?: boolean;
  readonly enableScripts?: boolean;
  readonly localResourceRoots?: string[];
  readonly permissions?: WebviewPermission[];
  readonly loading?: WebviewLoadingConfig;

  // Lifecycle hooks (all run on HOST side)
  readonly beforeMount?: (ctx: PluginContext) => Promise<unknown> | unknown;
  readonly afterMount?: (ctx: PluginContext, panel: WebviewPanel) => void;
  readonly loader?: (ctx: PluginContext) => Promise<unknown>;
  readonly action?: (ctx: PluginContext, data: unknown) => Promise<unknown>;
}

// ── Webview context (passed to render function) ─────────────

export interface WebviewContext {
  readonly initialData: unknown;
  readonly loaderData: unknown;
  readonly theme: WebviewTheme;
  readonly postMessage: (msg: WebviewMessage) => void;
  readonly onMessage: (handler: (msg: WebviewMessage) => void) => IDisposable;
}

// ── Theme passed to webview ─────────────────────────────────

export interface WebviewTheme {
  readonly kind: "dark" | "light" | "hc";
  readonly colors: Record<string, string>;
}

// ── WebviewPanel — the host-side handle ─────────────────────

export interface WebviewPanel {
  // Identity
  readonly id: string;
  readonly title: string;
  readonly location: WebviewLocation;

  // Visibility
  readonly visible: boolean;
  show(): void;
  hide(): void;
  toggle(): void;
  focus(): void;

  // Messaging
  postMessage(msg: WebviewMessage): void;
  onMessage(handler: (msg: WebviewMessage) => void): IDisposable;

  // Lifecycle
  reload(): void;
  dispose(): void;
  readonly disposed: boolean;

  // State
  readonly initialData: unknown;
  readonly loaderData: unknown;

  // Events
  onDidShow(handler: () => void): IDisposable;
  onDidHide(handler: () => void): IDisposable;
  onDidDispose(handler: () => void): IDisposable;

  // Metadata
  setTitle(title: string): void;
  setBadge(text: string | number): void;
  clearBadge(): void;
}

// ── WebviewDescriptor — lazy registration ───────────────────

export interface WebviewDescriptor {
  readonly id: string;
  readonly title: string;
  readonly location: WebviewLocation;
  readonly icon?: string;
  readonly command?: string;
  readonly keybinding?: string;
  readonly create: (ctx: PluginContext) => WebviewPanelOptions;
}

// ── Engine API (exposed inside the iframe via acquireEngineApi) ──

export interface EngineApi {
  // Messaging
  postMessage(msg: WebviewMessage): void;
  onMessage(handler: (msg: WebviewMessage) => void): void;

  // Commands
  executeCommand(commandId: string, ...args: unknown[]): Promise<unknown>;

  // State persistence
  getState(): Promise<Record<string, unknown>>;
  setState(state: Record<string, unknown>): Promise<void>;

  // Theme
  readonly theme: WebviewTheme;
  onThemeChange(handler: (theme: WebviewTheme) => void): void;

  // Editor info
  getActiveFile(): Promise<{ uri: string; language: string } | null>;
  getSelection(): Promise<{ text: string; range: unknown } | null>;
  getOpenFiles(): Promise<Array<{ uri: string; label: string; isDirty: boolean }>>;

  // FS (proxied through permission gate)
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listDir(dir: string): Promise<Array<{ name: string; isDirectory: boolean }>>;

  // Settings
  getSetting(key: string): Promise<unknown>;
  setSetting(key: string, value: unknown): Promise<void>;

  // Notifications
  showNotification(message: string, level?: "info" | "warning" | "error"): void;

  // Loader / Action data
  readonly initialData: unknown;
  readonly loaderData: unknown;
  onLoaderData(handler: (data: unknown) => void): void;
  onLoaderError(handler: (error: unknown) => void): void;

  // Action
  submitAction(data: unknown): Promise<unknown>;
  readonly actionPending: boolean;
  onActionComplete(handler: (result: unknown) => void): void;
  onActionError(handler: (error: unknown) => void): void;

  // Loading control (from inside webview)
  showLoading(config?: WebviewLoadingConfig): void;
  hideLoading(): void;
  readonly loading: boolean;

  // Trigger loader re-run from inside webview
  reload(): void;

  // Dispose
  dispose(): void;
}

// ── Webview Module API (exposed to other plugins) ───────────

export interface WebviewModuleAPI {
  createWebview(options: WebviewPanelOptions): WebviewPanel;
  registerWebview(descriptor: WebviewDescriptor): IDisposable;
  getWebview(id: string): WebviewPanel | null;
  getWebviews(): WebviewPanel[];
  hasWebview(id: string): boolean;
}
