// ── Plugin context — wraps Monaco + EventBus for each plugin ──
// Builds the PluginContext that every plugin receives in onMount().
// Auto-tracks all IDisposable registrations for bulk cleanup.

import type * as monacoNs from "monaco-editor";
import type {
  IDisposable,
  PluginContext as IPluginContext,
  PluginSettingsAccessor,
  PluginFsAccessor,
  PluginStorageAccessor,
  PluginAiAccessor,
  PluginAuthAccessor,
  PluginIndexerAccessor,
  PluginCommandsAccessor,
  PluginLayoutAccessor,
  PluginContextMenuAccessor,
  PluginNotificationsAccessor,
  PluginEventBusAccessor,
  Monaco,
  MonacoEditor,
} from "./types";
import type { EventBus } from "./event-bus";
import { DisposableStore } from "./disposable-store";
import { NotifyEvents } from "./events";

// ── Stub accessors (used before the respective module boots) ──

const NO_SETTINGS: PluginSettingsAccessor = {
  get() { return undefined as any; },
  set() {},
  reset() {},
  getAll() { return {}; },
  watch() { return { dispose() {} }; },
  register() {},
};

const notReady = (modName: string) => {
  throw new Error(`[PluginContext] ${modName} is not yet available. Ensure the module has booted.`);
};

const NO_FS: PluginFsAccessor = {
  read() { return notReady("fs") as any; },
  write() { return notReady("fs") as any; },
  delete() { return notReady("fs") as any; },
  rename() { return notReady("fs") as any; },
  list() { return notReady("fs") as any; },
  exists() { return notReady("fs") as any; },
  stat() { return notReady("fs") as any; },
  mkdir() { return notReady("fs") as any; },
};

const NO_STORAGE: PluginStorageAccessor = {
  get() { return notReady("storage") as any; },
  set() { return notReady("storage") as any; },
  delete() { return notReady("storage") as any; },
  clear() { return notReady("storage") as any; },
};

const NO_AI: PluginAiAccessor = {
  complete() { return notReady("ai") as any; },
  chat() { return notReady("ai") as any; },
  stream() { return notReady("ai") as any; },
};

const NO_AUTH: PluginAuthAccessor = {
  login() { return notReady("auth") as any; },
  logout() { return notReady("auth") as any; },
  getUser() { return null; },
  getToken() { return null; },
  isAuthenticated() { return false; },
};

const NO_INDEXER: PluginIndexerAccessor = {
  indexFile() { return notReady("indexer") as any; },
  indexWorkspace() { return notReady("indexer") as any; },
  search() { return notReady("indexer") as any; },
  getSymbols() { return notReady("indexer") as any; },
};

const NO_COMMANDS: PluginCommandsAccessor = {
  execute() { notReady("commands"); },
  register() { return notReady("commands") as any; },
  getAll() { return []; },
};

const NO_LAYOUT: PluginLayoutAccessor = {
  registerLeftView() { return notReady("layout") as any; },
  registerRightView() { return notReady("layout") as any; },
  registerBottomPanel() { return notReady("layout") as any; },
  toggleSidebar() { notReady("layout"); },
  togglePanel() { notReady("layout"); },
};

const NO_CONTEXT_MENU: PluginContextMenuAccessor = {
  register() { return notReady("contextMenu") as any; },
  show() { notReady("contextMenu"); },
};

const NO_NOTIFICATIONS: PluginNotificationsAccessor = {
  show() {},
  dismiss() {},
};

export class PluginContext implements IPluginContext {
  private store = new DisposableStore();
  private decorationIds: string[] = [];
  private filePath: string | undefined;

  // ── Lazy-injected module accessors ──────────────────────
  private _settings: PluginSettingsAccessor = NO_SETTINGS;
  private _fs: PluginFsAccessor = NO_FS;
  private _storage: PluginStorageAccessor = NO_STORAGE;
  private _ai: PluginAiAccessor = NO_AI;
  private _auth: PluginAuthAccessor = NO_AUTH;
  private _indexer: PluginIndexerAccessor = NO_INDEXER;
  private _commands: PluginCommandsAccessor = NO_COMMANDS;
  private _layout: PluginLayoutAccessor = NO_LAYOUT;
  private _contextMenu: PluginContextMenuAccessor = NO_CONTEXT_MENU;
  private _notifications: PluginNotificationsAccessor = NO_NOTIFICATIONS;

  constructor(
    public readonly pluginId: string,
    public readonly monaco: Monaco,
    public readonly editor: MonacoEditor,
    private readonly _eventBus: EventBus,
    filePath?: string,
  ) {
    this.filePath = filePath;
  }

  // ── Module accessor getters ─────────────────────────────

  get settings(): PluginSettingsAccessor { return this._settings; }
  get fs(): PluginFsAccessor { return this._fs; }
  get storage(): PluginStorageAccessor { return this._storage; }
  get ai(): PluginAiAccessor { return this._ai; }
  get auth(): PluginAuthAccessor { return this._auth; }
  get indexer(): PluginIndexerAccessor { return this._indexer; }
  get commands(): PluginCommandsAccessor { return this._commands; }
  get layout(): PluginLayoutAccessor { return this._layout; }
  get contextMenu(): PluginContextMenuAccessor { return this._contextMenu; }
  get notifications(): PluginNotificationsAccessor { return this._notifications; }

  /** EventBus — spec-compliant ctx.eventBus.emit/on/once pattern. */
  get eventBus(): PluginEventBusAccessor {
    return {
      emit: (event: string, data?: unknown) => this._eventBus.emit(event, data),
      on: (event: string, handler: (data?: unknown) => void) => this.on(event, handler),
      once: (event: string, handler: (data?: unknown) => void) => this.once(event, handler),
    };
  }

  // ── @internal — called by PluginEngine to wire module APIs ──

  setSettings(accessor: PluginSettingsAccessor): void { this._settings = accessor; }
  setFs(accessor: PluginFsAccessor): void { this._fs = accessor; }
  setStorage(accessor: PluginStorageAccessor): void { this._storage = accessor; }
  setAi(accessor: PluginAiAccessor): void { this._ai = accessor; }
  setAuth(accessor: PluginAuthAccessor): void { this._auth = accessor; }
  setIndexer(accessor: PluginIndexerAccessor): void { this._indexer = accessor; }
  setCommands(accessor: PluginCommandsAccessor): void { this._commands = accessor; }
  setLayout(accessor: PluginLayoutAccessor): void { this._layout = accessor; }
  setContextMenu(accessor: PluginContextMenuAccessor): void { this._contextMenu = accessor; }
  setNotifications(accessor: PluginNotificationsAccessor): void { this._notifications = accessor; }

  // ── Content / state ──────────────────────────────────────

  getContent(): string {
    return this.editor.getModel()?.getValue() ?? "";
  }

  setContent(value: string): void {
    this.editor.getModel()?.setValue(value);
  }

  getLanguage(): string {
    return this.editor.getModel()?.getLanguageId() ?? "plaintext";
  }

  setLanguage(languageId: string): void {
    const model = this.editor.getModel();
    if (model) this.monaco.editor.setModelLanguage(model, languageId);
  }

  getFilePath(): string | undefined {
    return this.filePath;
  }

  insertTextAtCursor(text: string): void {
    const selection = this.editor.getSelection();
    if (!selection) return;
    this.editor.executeEdits(this.pluginId, [
      { range: selection, text, forceMoveMarkers: true },
    ]);
  }

  getSelectedText(): string {
    const selection = this.editor.getSelection();
    if (!selection) return "";
    return this.editor.getModel()?.getValueInRange(selection) ?? "";
  }

  replaceSelection(text: string): void {
    const selection = this.editor.getSelection();
    if (!selection) return;
    this.editor.executeEdits(this.pluginId, [
      { range: selection, text, forceMoveMarkers: true },
    ]);
  }

  // ── Disposable tracking ──────────────────────────────────

  addDisposable(disposable: IDisposable): void {
    this.store.add(disposable);
  }

  // ── Notifications ────────────────────────────────────────

  notify(message: string, type: "info" | "success" | "warning" | "error" = "info"): void {
    this._eventBus.emit(NotifyEvents.Show, { message, level: type, source: this.pluginId });
  }

  // ── Keybindings + actions ────────────────────────────────

  addKeybinding(keybinding: number, handler: () => void, label?: string): void {
    const id = `${this.pluginId}.keybinding.${keybinding}`;
    const d = this.editor.addAction({
      id,
      label: label ?? id,
      keybindings: [keybinding],
      run: handler,
    });
    if (d) this.store.add(d);
  }

  addAction(action: monacoNs.editor.IActionDescriptor): void {
    const d = this.editor.addAction(action);
    if (d) this.store.add(d);
  }

  // ── Language provider registration (all 26) ──────────────
  // Each wraps the language selector into an array if needed,
  // registers via monaco.languages.register*(), and tracks disposal.

  private registerProvider(
    registerFn: (lang: string, provider: any) => IDisposable,
    languageSelector: string | string[],
    provider: unknown,
  ): void {
    const langs = Array.isArray(languageSelector) ? languageSelector : [languageSelector];
    for (const lang of langs) {
      this.store.add(registerFn.call(this.monaco.languages, lang, provider));
    }
  }

  registerCompletionProvider(ls: string | string[], p: monacoNs.languages.CompletionItemProvider): void {
    this.registerProvider(this.monaco.languages.registerCompletionItemProvider, ls, p);
  }
  registerHoverProvider(ls: string | string[], p: monacoNs.languages.HoverProvider): void {
    this.registerProvider(this.monaco.languages.registerHoverProvider, ls, p);
  }
  registerSignatureHelpProvider(ls: string | string[], p: monacoNs.languages.SignatureHelpProvider): void {
    this.registerProvider(this.monaco.languages.registerSignatureHelpProvider, ls, p);
  }
  registerDefinitionProvider(ls: string | string[], p: monacoNs.languages.DefinitionProvider): void {
    this.registerProvider(this.monaco.languages.registerDefinitionProvider, ls, p);
  }
  registerDeclarationProvider(ls: string | string[], p: monacoNs.languages.DeclarationProvider): void {
    this.registerProvider(this.monaco.languages.registerDeclarationProvider, ls, p);
  }
  registerTypeDefinitionProvider(ls: string | string[], p: monacoNs.languages.TypeDefinitionProvider): void {
    this.registerProvider(this.monaco.languages.registerTypeDefinitionProvider, ls, p);
  }
  registerImplementationProvider(ls: string | string[], p: monacoNs.languages.ImplementationProvider): void {
    this.registerProvider(this.monaco.languages.registerImplementationProvider, ls, p);
  }
  registerReferenceProvider(ls: string | string[], p: monacoNs.languages.ReferenceProvider): void {
    this.registerProvider(this.monaco.languages.registerReferenceProvider, ls, p);
  }
  registerDocumentHighlightProvider(ls: string | string[], p: monacoNs.languages.DocumentHighlightProvider): void {
    this.registerProvider(this.monaco.languages.registerDocumentHighlightProvider, ls, p);
  }
  registerDocumentSymbolProvider(ls: string | string[], p: monacoNs.languages.DocumentSymbolProvider): void {
    this.registerProvider(this.monaco.languages.registerDocumentSymbolProvider, ls, p);
  }
  registerCodeActionProvider(ls: string | string[], p: monacoNs.languages.CodeActionProvider): void {
    this.registerProvider(this.monaco.languages.registerCodeActionProvider, ls, p);
  }
  registerCodeLensProvider(ls: string | string[], p: monacoNs.languages.CodeLensProvider): void {
    this.registerProvider(this.monaco.languages.registerCodeLensProvider, ls, p);
  }
  registerLinkProvider(ls: string | string[], p: monacoNs.languages.LinkProvider): void {
    this.registerProvider(this.monaco.languages.registerLinkProvider, ls, p);
  }
  registerColorProvider(ls: string | string[], p: monacoNs.languages.DocumentColorProvider): void {
    this.registerProvider(this.monaco.languages.registerColorProvider, ls, p);
  }
  registerDocumentFormattingProvider(ls: string | string[], p: monacoNs.languages.DocumentFormattingEditProvider): void {
    this.registerProvider(this.monaco.languages.registerDocumentFormattingEditProvider, ls, p);
  }
  registerDocumentRangeFormattingProvider(ls: string | string[], p: monacoNs.languages.DocumentRangeFormattingEditProvider): void {
    this.registerProvider(this.monaco.languages.registerDocumentRangeFormattingEditProvider, ls, p);
  }
  registerOnTypeFormattingProvider(ls: string | string[], p: monacoNs.languages.OnTypeFormattingEditProvider): void {
    this.registerProvider(this.monaco.languages.registerOnTypeFormattingEditProvider, ls, p);
  }
  registerFoldingRangeProvider(ls: string | string[], p: monacoNs.languages.FoldingRangeProvider): void {
    this.registerProvider(this.monaco.languages.registerFoldingRangeProvider, ls, p);
  }
  registerRenameProvider(ls: string | string[], p: monacoNs.languages.RenameProvider): void {
    this.registerProvider(this.monaco.languages.registerRenameProvider, ls, p);
  }
  registerNewSymbolNameProvider(ls: string | string[], p: monacoNs.languages.NewSymbolNamesProvider): void {
    this.registerProvider(this.monaco.languages.registerNewSymbolNameProvider, ls, p);
  }
  registerSelectionRangeProvider(ls: string | string[], p: monacoNs.languages.SelectionRangeProvider): void {
    this.registerProvider(this.monaco.languages.registerSelectionRangeProvider, ls, p);
  }
  registerLinkedEditingRangeProvider(ls: string | string[], p: monacoNs.languages.LinkedEditingRangeProvider): void {
    this.registerProvider(this.monaco.languages.registerLinkedEditingRangeProvider, ls, p);
  }
  registerInlineCompletionsProvider(ls: string | string[], p: monacoNs.languages.InlineCompletionsProvider): void {
    this.registerProvider(this.monaco.languages.registerInlineCompletionsProvider, ls, p);
  }
  registerInlayHintsProvider(ls: string | string[], p: monacoNs.languages.InlayHintsProvider): void {
    this.registerProvider(this.monaco.languages.registerInlayHintsProvider, ls, p);
  }
  registerDocumentSemanticTokensProvider(ls: string | string[], p: monacoNs.languages.DocumentSemanticTokensProvider): void {
    this.registerProvider(this.monaco.languages.registerDocumentSemanticTokensProvider, ls, p);
  }
  registerDocumentRangeSemanticTokensProvider(ls: string | string[], p: monacoNs.languages.DocumentRangeSemanticTokensProvider): void {
    this.registerProvider(this.monaco.languages.registerDocumentRangeSemanticTokensProvider, ls, p);
  }

  // ── Markers / decorations ────────────────────────────────

  setModelMarkers(owner: string, markers: monacoNs.editor.IMarkerData[]): void {
    const model = this.editor.getModel();
    if (model) this.monaco.editor.setModelMarkers(model, owner, markers);
  }

  applyDecorations(decorations: monacoNs.editor.IModelDeltaDecoration[]): string[] {
    this.decorationIds = this.editor.deltaDecorations(this.decorationIds, decorations);
    return this.decorationIds;
  }

  removeDecorations(decorationIds: string[]): void {
    this.editor.deltaDecorations(decorationIds, []);
    this.decorationIds = this.decorationIds.filter((id) => !decorationIds.includes(id));
  }

  // ── Event bus ────────────────────────────────────────────

  emit(event: string, data?: unknown): void {
    this._eventBus.emit(event, data);
  }

  on(event: string, handler: (data?: unknown) => void): IDisposable {
    const d = this._eventBus.on(event, handler);
    this.store.add(d);
    return d;
  }

  once(event: string, handler: (data?: unknown) => void): IDisposable {
    const d = this._eventBus.once(event, handler);
    this.store.add(d);
    return d;
  }

  // ── Internal: update file path (called by engine) ────────

  /** @internal */
  setFilePath(path: string | undefined): void {
    this.filePath = path;
  }

  // ── Cleanup ──────────────────────────────────────────────

  dispose(): void {
    this.removeDecorations(this.decorationIds);
    this.store.dispose();
  }
}
