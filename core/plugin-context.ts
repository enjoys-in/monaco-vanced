// ── Plugin context — wraps Monaco + EventBus for each plugin ──
// Builds the PluginContext that every plugin receives in onMount().
// Auto-tracks all IDisposable registrations for bulk cleanup.

import type * as monacoNs from "monaco-editor";
import type { IDisposable, PluginContext as IPluginContext, PluginSettingsAccessor, Monaco, MonacoEditor } from "./types";
import type { EventBus } from "./event-bus";
import { DisposableStore } from "./disposable-store";
import { NotifyEvents } from "./events";

// ── Stub settings accessor (used before settings-module boots) ──

const NO_SETTINGS: PluginSettingsAccessor = {
  get() { return undefined as any; },
  set() {},
  reset() {},
  getAll() { return {}; },
  watch() { return { dispose() {} }; },
  register() {},
};

export class PluginContext implements IPluginContext {
  private store = new DisposableStore();
  private decorationIds: string[] = [];
  private filePath: string | undefined;
  private _settings: PluginSettingsAccessor = NO_SETTINGS;

  constructor(
    public readonly pluginId: string,
    public readonly monaco: Monaco,
    public readonly editor: MonacoEditor,
    private readonly eventBus: EventBus,
    filePath?: string,
  ) {
    this.filePath = filePath;
  }

  /** Settings accessor — wired by the engine after settings-module boots. */
  get settings(): PluginSettingsAccessor {
    return this._settings;
  }

  /** @internal Called by PluginEngine to wire the settings API. */
  setSettings(accessor: PluginSettingsAccessor): void {
    this._settings = accessor;
  }

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
    this.eventBus.emit(NotifyEvents.Show, { message, level: type, source: this.pluginId });
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
    this.eventBus.emit(event, data);
  }

  on(event: string, handler: (data?: unknown) => void): IDisposable {
    const d = this.eventBus.on(event, handler);
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
