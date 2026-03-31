// ── Core type contracts ──────────────────────────────────────
// Source of truth for all shared interfaces. No module imports another module —
// they receive these types via dependency injection (PluginContext).

import type * as monacoNs from "monaco-editor";

// ── Re-export Monaco namespace alias ────────────────────────

export type Monaco = typeof monacoNs;
export type MonacoEditor = monacoNs.editor.IStandaloneCodeEditor;

// ── Disposable ──────────────────────────────────────────────

export interface IDisposable {
  dispose(): void;
}

// ── Plugin interface ────────────────────────────────────────

export interface MonacoPlugin {
  /** Unique plugin identifier (kebab-case) */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Semver version string */
  readonly version: string;
  /** Plugin description */
  readonly description?: string;
  /** IDs of other plugins this depends on (resolved before init) */
  readonly dependencies?: string[];
  /** Load priority — higher number loads first (default 0) */
  readonly priority?: number;
  /** Whether the plugin is enabled by default (default true) */
  readonly defaultEnabled?: boolean;

  /**
   * Called when Monaco is loaded but before the editor is created.
   * Use for registering languages, themes, monarch grammars.
   */
  onBeforeMount?(monaco: Monaco): void | Promise<void>;

  /**
   * Called after the editor instance is created. Primary lifecycle hook.
   * Register providers, keybindings, actions, decorations.
   */
  onMount?(ctx: PluginContext): void | Promise<void>;

  /**
   * Called after onMount succeeds. Use for post-init setup.
   */
  onReady?(ctx: PluginContext): void | Promise<void>;

  /**
   * Called if onMount throws. Receives the error + context for recovery.
   */
  onFailed?(error: unknown, ctx: PluginContext): void | Promise<void>;

  /** Called when the editor language changes. */
  onLanguageChange?(language: string, ctx: PluginContext): void;

  /** Called on content change (debounced by the host). */
  onContentChange?(content: string, ctx: PluginContext): void;

  /** Called when editor configuration changes. */
  onConfigChange?(config: Record<string, unknown>, ctx: PluginContext): void;

  /** Cleanup. Remove side effects not tracked via addDisposable. */
  onDispose?(): void;
}

// ── Plugin settings accessor (injected by settings-module) ──

export interface PluginSettingsAccessor {
  get<T = unknown>(key: string): T;
  set<T = unknown>(key: string, value: T, layer?: string): void;
  reset(key: string, layer?: string): void;
  getAll(namespace: string): Record<string, unknown>;
  watch(key: string, cb: (value: unknown) => void): IDisposable;
  register(schema: { namespace: string; schema: Record<string, { type: string; default: unknown; description?: string }> }): void;
}

// ── Module accessor stubs (lazy-injected via "<module>:api-ready" events) ──
// Each module exposes its API via the EventBus. The PluginContext holds these
// as lazy properties — undefined until the module boots (same pattern as settings).

/** Filesystem module API surface. Injected via "fs:api-ready". */
export interface PluginFsAccessor {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  delete(path: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  list(path: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean }>;
  mkdir(path: string): Promise<void>;
}

/** Storage module API surface. Injected via "storage:api-ready". */
export interface PluginStorageAccessor {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

/** AI module API surface. Injected via "ai:api-ready". */
export interface PluginAiAccessor {
  complete(prompt: string, opts?: Record<string, unknown>): Promise<string>;
  chat(messages: Array<{ role: string; content: string }>, opts?: Record<string, unknown>): Promise<string>;
  stream(prompt: string, opts?: Record<string, unknown>): AsyncIterable<string>;
}

/** Auth module API surface. Injected via "auth:api-ready". */
export interface PluginAuthAccessor {
  login(provider: string): Promise<void>;
  logout(): Promise<void>;
  getUser(): { id: string; name: string; email?: string; avatar?: string } | null;
  getToken(provider: string): string | null;
  isAuthenticated(): boolean;
}

/** Indexer module API surface. Injected via "indexer:api-ready". */
export interface PluginIndexerAccessor {
  indexFile(path: string, content: string): Promise<void>;
  indexWorkspace(): Promise<void>;
  search(query: string): Promise<Array<{ path: string; line: number; text: string }>>;
  getSymbols(path: string): Promise<Array<{ name: string; kind: string; range: unknown }>>;
}

/** Commands module API surface. Injected via "commands:api-ready". */
export interface PluginCommandsAccessor {
  execute(commandId: string, ...args: unknown[]): void;
  register(commandId: string, handler: (...args: unknown[]) => void, label?: string): IDisposable;
  getAll(): Array<{ id: string; label?: string }>;
}

/** Layout module API surface. Injected via "layout:api-ready". */
export interface PluginLayoutAccessor {
  registerLeftView(view: { id: string; title: string; icon?: string; render: (container: HTMLElement) => void }): IDisposable;
  registerRightView(view: { id: string; title: string; render: (container: HTMLElement) => void }): IDisposable;
  registerBottomPanel(panel: { id: string; title: string; render: (container: HTMLElement) => void }): IDisposable;
  toggleSidebar(): void;
  togglePanel(): void;
}

/** Context menu module API surface. Injected via "contextMenu:api-ready". */
export interface PluginContextMenuAccessor {
  register(item: { label: string; command: string; group?: string; when?: string }): IDisposable;
  show(x: number, y: number, items: Array<{ label: string; handler: () => void }>): void;
}

/** Notification module API surface. Injected via "notifications:api-ready". */
export interface PluginNotificationsAccessor {
  show(message: string, type?: "info" | "success" | "warning" | "error"): void;
  dismiss(id: string): void;
}

/** EventBus accessor — exposed directly on PluginContext for spec compliance. */
export interface PluginEventBusAccessor {
  emit(event: string, data?: unknown): void;
  on(event: string, handler: (data?: unknown) => void): IDisposable;
  once(event: string, handler: (data?: unknown) => void): IDisposable;
}

// ── Plugin context ──────────────────────────────────────────

export interface PluginContext {
  /** The raw Monaco namespace */
  readonly monaco: Monaco;
  /** The editor instance */
  readonly editor: MonacoEditor;
  /** Plugin ID that owns this context */
  readonly pluginId: string;

  // ── Module accessors (lazy-injected via "<module>:api-ready" events) ──

  /** Settings accessor — available after settings-module boots. */
  readonly settings: PluginSettingsAccessor;
  /** Filesystem module — available after fs-module boots. */
  readonly fs: PluginFsAccessor;
  /** Storage module — available after storage-module boots. */
  readonly storage: PluginStorageAccessor;
  /** AI module — available after ai-module boots. */
  readonly ai: PluginAiAccessor;
  /** Auth module — available after auth-module boots. */
  readonly auth: PluginAuthAccessor;
  /** Indexer module — available after indexer-module boots. */
  readonly indexer: PluginIndexerAccessor;
  /** Commands module — available after command-module boots. */
  readonly commands: PluginCommandsAccessor;
  /** Layout module — available after layout-module boots. */
  readonly layout: PluginLayoutAccessor;
  /** Context menu module — available after context-menu-module boots. */
  readonly contextMenu: PluginContextMenuAccessor;
  /** Notifications module — available after notification-module boots. */
  readonly notifications: PluginNotificationsAccessor;
  /** EventBus — direct access matching spec's ctx.eventBus pattern. */
  readonly eventBus: PluginEventBusAccessor;

  // ── Content / state ────────────────────────────────────

  getContent(): string;
  setContent(value: string): void;
  getLanguage(): string;
  setLanguage(languageId: string): void;
  getFilePath(): string | undefined;
  insertTextAtCursor(text: string): void;
  getSelectedText(): string;
  replaceSelection(text: string): void;

  // ── Disposable tracking ────────────────────────────────

  addDisposable(disposable: IDisposable): void;

  // ── Notifications ──────────────────────────────────────

  notify(message: string, type?: "info" | "success" | "warning" | "error"): void;

  // ── Keybindings + actions ──────────────────────────────

  addKeybinding(keybinding: number, handler: () => void, label?: string): void;
  addAction(action: monacoNs.editor.IActionDescriptor): void;

  // ── Language provider registration (all 26) ────────────

  registerCompletionProvider(languageSelector: string | string[], provider: monacoNs.languages.CompletionItemProvider): void;
  registerHoverProvider(languageSelector: string | string[], provider: monacoNs.languages.HoverProvider): void;
  registerSignatureHelpProvider(languageSelector: string | string[], provider: monacoNs.languages.SignatureHelpProvider): void;
  registerDefinitionProvider(languageSelector: string | string[], provider: monacoNs.languages.DefinitionProvider): void;
  registerDeclarationProvider(languageSelector: string | string[], provider: monacoNs.languages.DeclarationProvider): void;
  registerTypeDefinitionProvider(languageSelector: string | string[], provider: monacoNs.languages.TypeDefinitionProvider): void;
  registerImplementationProvider(languageSelector: string | string[], provider: monacoNs.languages.ImplementationProvider): void;
  registerReferenceProvider(languageSelector: string | string[], provider: monacoNs.languages.ReferenceProvider): void;
  registerDocumentHighlightProvider(languageSelector: string | string[], provider: monacoNs.languages.DocumentHighlightProvider): void;
  registerDocumentSymbolProvider(languageSelector: string | string[], provider: monacoNs.languages.DocumentSymbolProvider): void;
  registerCodeActionProvider(languageSelector: string | string[], provider: monacoNs.languages.CodeActionProvider): void;
  registerCodeLensProvider(languageSelector: string | string[], provider: monacoNs.languages.CodeLensProvider): void;
  registerLinkProvider(languageSelector: string | string[], provider: monacoNs.languages.LinkProvider): void;
  registerColorProvider(languageSelector: string | string[], provider: monacoNs.languages.DocumentColorProvider): void;
  registerDocumentFormattingProvider(languageSelector: string | string[], provider: monacoNs.languages.DocumentFormattingEditProvider): void;
  registerDocumentRangeFormattingProvider(languageSelector: string | string[], provider: monacoNs.languages.DocumentRangeFormattingEditProvider): void;
  registerOnTypeFormattingProvider(languageSelector: string | string[], provider: monacoNs.languages.OnTypeFormattingEditProvider): void;
  registerFoldingRangeProvider(languageSelector: string | string[], provider: monacoNs.languages.FoldingRangeProvider): void;
  registerRenameProvider(languageSelector: string | string[], provider: monacoNs.languages.RenameProvider): void;
  registerNewSymbolNameProvider(languageSelector: string | string[], provider: monacoNs.languages.NewSymbolNamesProvider): void;
  registerSelectionRangeProvider(languageSelector: string | string[], provider: monacoNs.languages.SelectionRangeProvider): void;
  registerLinkedEditingRangeProvider(languageSelector: string | string[], provider: monacoNs.languages.LinkedEditingRangeProvider): void;
  registerInlineCompletionsProvider(languageSelector: string | string[], provider: monacoNs.languages.InlineCompletionsProvider): void;
  registerInlayHintsProvider(languageSelector: string | string[], provider: monacoNs.languages.InlayHintsProvider): void;
  registerDocumentSemanticTokensProvider(languageSelector: string | string[], provider: monacoNs.languages.DocumentSemanticTokensProvider): void;
  registerDocumentRangeSemanticTokensProvider(languageSelector: string | string[], provider: monacoNs.languages.DocumentRangeSemanticTokensProvider): void;

  // ── Markers / decorations ──────────────────────────────

  setModelMarkers(owner: string, markers: monacoNs.editor.IMarkerData[]): void;
  applyDecorations(decorations: monacoNs.editor.IModelDeltaDecoration[]): string[];
  removeDecorations(decorationIds: string[]): void;

  // ── Event bus (cross-plugin communication) ─────────────

  emit(event: string, data?: unknown): void;
  on(event: string, handler: (data?: unknown) => void): IDisposable;
  once(event: string, handler: (data?: unknown) => void): IDisposable;
}

// ── Boot configuration ──────────────────────────────────────

export type PluginErrorStrategy = "skip" | "abort" | "retry";

export interface BootConfig {
  /** What to do when a plugin fails to init (default: "skip") */
  onPluginError?: PluginErrorStrategy;
  /** Max retries when strategy is "retry" (default: 3) */
  retryCount?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number;
  /** Called when ALL plugins have successfully booted */
  onAllReady?: (pluginIds: string[]) => void;
  /** Called when any plugin fails during boot */
  onAnyFailed?: (failures: Array<{ pluginId: string; error: unknown }>) => void;
}

// ── Operation hooks (universal callback pattern — spec-compliant) ─────────

export interface OperationResult<TOp extends string = string> {
  module: string;
  op: TOp;
  duration: number;
  payload: unknown;
}

export interface OperationError<TOp extends string = string> {
  module: string;
  op: TOp;
  message: string;
  cause?: Error;
  duration: number;
}

export interface OperationHooks<TOp extends string = string> {
  onSuccess?(result: OperationResult<TOp>): void | Promise<void>;
  onError?(error: OperationError<TOp>): void | Promise<void>;
}
