// ── Model manager — create/dispose Monaco text models per file URI ──
import type * as monacoNs from "monaco-editor";
import type { PluginContext } from "@core/types";
import type { ModelState } from "./types";
import { TabEvents, ModelEvents } from "@core/events";

type Monaco = typeof monacoNs;

export class ModelManager {
  private models = new Map<string, monacoNs.editor.ITextModel>();
  private dirty = new Set<string>();
  private monaco: Monaco;
  private ctx: PluginContext;

  constructor(monaco: Monaco, ctx: PluginContext) {
    this.monaco = monaco;
    this.ctx = ctx;
  }

  /**
   * Create or retrieve a model for the given URI.
   * Reuses an existing model if one already exists for that URI.
   */
  create(uri: string, content: string, language?: string): monacoNs.editor.ITextModel {
    const existing = this.models.get(uri);
    if (existing && !existing.isDisposed()) return existing;

    const monacoUri = this.monaco.Uri.parse(uri);
    const detectedLang = language ?? this.detectLanguage(uri);
    const model = this.monaco.editor.createModel(content, detectedLang, monacoUri);

    this.models.set(uri, model);

    // Track dirty state via version changes
    model.onDidChangeContent(() => {
      this.dirty.add(uri);
      this.ctx.emit(TabEvents.Dirty, { uri, dirty: true });
    });

    this.ctx.emit(ModelEvents.Create, { uri, language: detectedLang });
    return model;
  }

  /**
   * Dispose a single model by URI.
   */
  dispose(uri: string): void {
    const model = this.models.get(uri);
    if (!model) return;
    model.dispose();
    this.models.delete(uri);
    this.dirty.delete(uri);
    this.ctx.emit(ModelEvents.Dispose, { uri });
  }

  /**
   * Get an existing model by URI.
   */
  get(uri: string): monacoNs.editor.ITextModel | undefined {
    const m = this.models.get(uri);
    return m && !m.isDisposed() ? m : undefined;
  }

  /**
   * Mark a model as clean (after save).
   */
  markClean(uri: string): void {
    this.dirty.delete(uri);
    this.ctx.emit(TabEvents.Dirty, { uri, dirty: false });
  }

  isDirty(uri: string): boolean {
    return this.dirty.has(uri);
  }

  getState(uri: string): ModelState | undefined {
    const model = this.models.get(uri);
    if (!model || model.isDisposed()) return undefined;
    return {
      uri,
      language: model.getLanguageId(),
      versionId: model.getVersionId(),
      dirty: this.dirty.has(uri),
      lineCount: model.getLineCount(),
    };
  }

  getAllUris(): string[] {
    return [...this.models.keys()];
  }

  /**
   * Dispose all models. Called during shutdown.
   */
  disposeAll(): void {
    for (const [uri, model] of this.models) {
      model.dispose();
      this.ctx.emit(ModelEvents.Dispose, { uri });
    }
    this.models.clear();
    this.dirty.clear();
  }

  private detectLanguage(uri: string): string {
    const ext = uri.split(".").pop()?.toLowerCase() ?? "";
    // Let Monaco auto-detect via its built-in language registry
    const lang = this.monaco.languages.getLanguages().find((l) =>
      l.extensions?.includes(`.${ext}`),
    );
    return lang?.id ?? "plaintext";
  }
}
