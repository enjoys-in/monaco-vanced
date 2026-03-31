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

// ── Plugin context ──────────────────────────────────────────

export interface PluginContext {
  /** The raw Monaco namespace */
  readonly monaco: Monaco;
  /** The editor instance */
  readonly editor: MonacoEditor;
  /** Plugin ID that owns this context */
  readonly pluginId: string;

  /**
   * Settings accessor — available after settings-module boots.
   * Modules use ctx.settings.get("editor.fontSize") etc.
   */
  readonly settings: PluginSettingsAccessor;

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

// ── Operation hooks (universal callback pattern) ─────────

export interface OperationResult<T = unknown> {
  operation: string;
  module: string;
  data: T;
  timestamp: number;
}

export interface OperationError<T = unknown> {
  operation: string;
  module: string;
  error: unknown;
  context?: T;
  timestamp: number;
}

export interface OperationHooks<T = unknown> {
  onSuccess?(result: OperationResult<T>): void;
  onError?(error: OperationError<T>): void;
}
