// ── Symbol index plugin — powers go-to-definition, references, hover, rename ──
import type * as monacoNs from "monaco-editor";
import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import { IndexSymbolEvents, FileEvents } from "@core/events";
import { IndexStore } from "./index-store";
import {
  registerAllProviders,
  registerWorkspaceProvider,
} from "./provider-factory";

export interface SymbolIndexPluginOptions {
  /** Languages to register providers for (default: all registered languages) */
  languages?: string[];
}

export function createSymbolIndexPlugin(
  options: SymbolIndexPluginOptions = {},
): MonacoPlugin {
  const store = new IndexStore();
  const disposables: IDisposable[] = [];

  return {
    id: "symbol-index-module",
    name: "Symbol Index",
    version: "1.0.0",
    description:
      "Indexes symbols across all workspace files. Powers go-to-definition, find references, document symbols, workspace symbols, hover, and rename.",
    dependencies: ["editor-module"],
    priority: 70,
    defaultEnabled: true,

    onMount(ctx: PluginContext) {
      const { monaco } = ctx;

      // ── Determine which languages to register for ──────────
      const languages = options.languages ??
        monaco.languages.getLanguages().map((l) => l.id);

      // ── Register all 6 providers per language ──────────────
      for (const lang of languages) {
        disposables.push(...registerAllProviders(monaco, store, lang));
      }

      // ── Register language-agnostic workspace symbol provider ──
      disposables.push(registerWorkspaceProvider(monaco, store));

      // ── Index current editor content on mount ──────────────
      const currentModel = ctx.editor.getModel();
      if (currentModel) {
        const path = currentModel.uri.path;
        const content = currentModel.getValue();
        store.indexFile(path, content);
        ctx.emit(IndexSymbolEvents.FileDone, {
          path,
          symbolCount: store.lookupInFile(path).length,
        });
      }

      // ── React to file lifecycle events ─────────────────────

      // When a file is read/opened → index it
      disposables.push(
        ctx.on(FileEvents.Read, (payload) => {
          const { path, content } = payload as {
            path: string;
            content: string;
          };
          ctx.emit(IndexSymbolEvents.FileStart, { path });
          store.indexFile(path, content);
          ctx.emit(IndexSymbolEvents.FileDone, {
            path,
            symbolCount: store.lookupInFile(path).length,
          });
        }),
      );

      // When a file is saved → re-index with fresh content
      disposables.push(
        ctx.on(FileEvents.Saved, (payload) => {
          const { path, content } = payload as {
            path: string;
            content?: string;
          };
          if (content) {
            store.indexFile(path, content);
            ctx.emit(IndexSymbolEvents.FileDone, {
              path,
              symbolCount: store.lookupInFile(path).length,
            });
          }
        }),
      );

      // When a file is deleted → remove from index
      disposables.push(
        ctx.on(FileEvents.Deleted, (payload) => {
          const { path } = payload as { path: string };
          store.removeFile(path);
          ctx.emit(IndexSymbolEvents.FileRemove, { path });
        }),
      );

      // ── Index on model content changes (debounced via editor) ──
      // Monaco fires onDidChangeModelContent; we re-index the active model
      const editorDisposable = ctx.editor.onDidChangeModelContent(() => {
        const model = ctx.editor.getModel();
        if (!model) return;
        const path = model.uri.path;
        store.indexFile(path, model.getValue());
      });
      disposables.push(editorDisposable);

      // ── Also index when models are created ─────────────────
      const modelDisposable = monaco.editor.onDidCreateModel(
        (model: monacoNs.editor.ITextModel) => {
          const path = model.uri.path;
          store.indexFile(path, model.getValue());
        },
      );
      disposables.push(modelDisposable);

      ctx.emit(IndexSymbolEvents.Ready, {});
    },

    onDispose() {
      for (const d of disposables) d.dispose();
      disposables.length = 0;
      store.clear();
    },
  };
}

export { IndexStore } from "./index-store";
export type {
  SymbolEntry,
  SymbolIndex,
  SymbolRange,
  SymbolKind,
} from "./types";
export { toMonacoRange, toMonacoSymbolKind } from "./types";