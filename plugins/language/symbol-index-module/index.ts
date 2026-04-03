// ── Symbol index plugin — powers go-to-definition, references, hover, rename ──
// Fetches symbol patterns dynamically from CDN per language via @enjoys/context-engine.
// Caches in IndexedDB (Dexie) with manifest version tracking.
import type * as monacoNs from "monaco-editor";
import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import { IndexSymbolEvents, FileEvents } from "@core/events";
import { IndexStore } from "./index-store";
import {
  registerAllProviders,
  registerWorkspaceProvider,
} from "./provider-factory";
import {
  ensureManifest,
  getSymbolPatterns,
  preloadSymbolPatterns,
} from "./lang-data-fetcher";

export interface SymbolIndexPluginOptions {
  /** Languages to register providers for (default: all registered languages) */
  languages?: string[];
  /** Languages to preload patterns for on boot (default: common web languages) */
  preload?: string[];
}

const DEFAULT_PRELOAD = [
  "typescript",
  "javascript",
  "html",
  "css",
  "json",
  "python",
];

export function createSymbolIndexPlugin(
  options: SymbolIndexPluginOptions = {},
): MonacoPlugin {
  const store = new IndexStore();
  const disposables: IDisposable[] = [];

  /** Track which langIds we've started pattern loading for */
  const loadingLangs = new Set<string>();

  /**
   * Ensure patterns are loaded for a language, then (re-)index the file.
   * Non-blocking for the caller — fires and forgets.
   */
  async function ensurePatternsAndIndex(
    ctx: PluginContext,
    path: string,
    content: string,
    langId: string,
  ): Promise<void> {
    if (!store.hasPatterns(langId)) {
      if (loadingLangs.has(langId)) return; // already in-flight
      loadingLangs.add(langId);
      try {
        const patterns = await getSymbolPatterns(langId);
        store.setPatterns(langId, patterns);
      } catch (err) {
        console.warn(`[symbol-index] Failed to load patterns for ${langId}:`, err);
        loadingLangs.delete(langId);
        return;
      }
    }
    store.indexFile(path, content, langId);
    ctx.emit(IndexSymbolEvents.FileDone, {
      path,
      symbolCount: store.lookupInFile(path).length,
    });
  }

  /** Resolve langId for a model */
  function getLangId(model: monacoNs.editor.ITextModel): string {
    return model.getLanguageId?.() ?? "plaintext";
  }

  return {
    id: "symbol-index-module",
    name: "Symbol Index",
    version: "2.0.0",
    description:
      "Indexes symbols across all workspace files using CDN-fetched patterns per language. " +
      "Powers go-to-definition, find references, document symbols, workspace symbols, hover, and rename.",
    dependencies: ["editor-module"],
    priority: 70,
    defaultEnabled: true,

    async onBeforeMount() {
      // Start manifest fetch + preload common language patterns early
      try {
        await ensureManifest();
        const preloadList = options.preload ?? DEFAULT_PRELOAD;
        await preloadSymbolPatterns(preloadList);
        for (const langId of preloadList) {
          const patterns = await getSymbolPatterns(langId);
          if (patterns.length) store.setPatterns(langId, patterns);
        }
      } catch (err) {
        console.warn("[symbol-index] Manifest/preload failed:", err);
      }
    },

    onMount(ctx: PluginContext) {
      const { monaco } = ctx;

      // ── Determine which languages to register providers for ──
      const languages =
        options.languages ??
        monaco.languages.getLanguages().map((l) => l.id);

      // ── Register all providers per language ────────────────
      for (const lang of languages) {
        disposables.push(...registerAllProviders(monaco, store, lang));
      }

      // ── Register language-agnostic workspace symbol provider ──
      disposables.push(registerWorkspaceProvider(monaco, store));

      // ── Index current editor content on mount ──────────────
      const currentModel = ctx.editor.getModel();
      if (currentModel) {
        const path = currentModel.uri.path;
        const langId = getLangId(currentModel);
        ensurePatternsAndIndex(ctx, path, currentModel.getValue(), langId);
      }

      // ── React to file lifecycle events ─────────────────────

      // When a file is read/opened → fetch patterns for its language, then index
      disposables.push(
        ctx.on(FileEvents.Read, (payload) => {
          const { path, content } = payload as {
            path: string;
            content: string;
          };
          ctx.emit(IndexSymbolEvents.FileStart, { path });
          // Resolve langId from Monaco models
          const model = monaco.editor
            .getModels()
            .find((m) => m.uri.path === path || m.uri.path === `/${path}`);
          const langId = model ? getLangId(model) : langIdFromPath(path);
          ensurePatternsAndIndex(ctx, path, content, langId);
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
            const model = monaco.editor
              .getModels()
              .find((m) => m.uri.path === path || m.uri.path === `/${path}`);
            const langId = model ? getLangId(model) : langIdFromPath(path);
            ensurePatternsAndIndex(ctx, path, content, langId);
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

      // ── Index on model content changes ─────────────────────
      const editorDisposable = ctx.editor.onDidChangeModelContent(() => {
        const model = ctx.editor.getModel();
        if (!model) return;
        const path = model.uri.path;
        const langId = getLangId(model);
        // Only index if we already have patterns (don't block typing)
        if (store.hasPatterns(langId)) {
          store.indexFile(path, model.getValue(), langId);
        }
      });
      disposables.push(editorDisposable);

      // ── Index when models are created ──────────────────────
      const modelDisposable = monaco.editor.onDidCreateModel(
        (model: monacoNs.editor.ITextModel) => {
          const path = model.uri.path;
          const langId = getLangId(model);
          ensurePatternsAndIndex(ctx, path, model.getValue(), langId);
        },
      );
      disposables.push(modelDisposable);

      // ── When model language changes, re-fetch patterns ─────
      const langChangeDisposable = monaco.editor.onDidChangeModelLanguage?.(
        (e: { model: monacoNs.editor.ITextModel }) => {
          const model = e.model;
          const path = model.uri.path;
          const langId = getLangId(model);
          loadingLangs.delete(langId); // force re-check
          ensurePatternsAndIndex(ctx, path, model.getValue(), langId);
        },
      );
      if (langChangeDisposable) disposables.push(langChangeDisposable);

      ctx.emit(IndexSymbolEvents.Ready, {});
    },

    onDispose() {
      for (const d of disposables) d.dispose();
      disposables.length = 0;
      store.clear();
      loadingLangs.clear();
    },
  };
}

// ── Fallback langId from file extension ──────────────────────

const EXT_MAP: Record<string, string> = {
  ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
  py: "python", go: "go", rs: "rust", rb: "ruby", java: "java",
  kt: "kotlin", cs: "csharp", cpp: "cpp", c: "c", h: "c",
  php: "php", swift: "swift", lua: "lua", sql: "sql",
  html: "html", css: "css", scss: "scss", less: "less",
  json: "json", yaml: "yaml", yml: "yaml", toml: "toml",
  md: "markdown", sh: "shell", bash: "shell", zsh: "shell",
  xml: "xml", graphql: "graphql", proto: "protobuf",
  prisma: "prisma", dockerfile: "dockerfile", makefile: "makefile",
  dart: "dart", scala: "scala", r: "r", vue: "html",
};

function langIdFromPath(path: string): string {
  const name = path.split("/").pop() ?? "";
  // Check full filename for special cases
  const lower = name.toLowerCase();
  if (lower === "dockerfile" || lower.startsWith("dockerfile."))
    return "dockerfile";
  if (lower === "makefile" || lower.startsWith("makefile.")) return "makefile";
  // Extension-based
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MAP[ext] ?? "plaintext";
}

export { IndexStore } from "./index-store";
export type {
  SymbolEntry,
  SymbolIndex,
  SymbolRange,
  SymbolKind,
} from "./types";
export { toMonacoRange, toMonacoSymbolKind } from "./types";