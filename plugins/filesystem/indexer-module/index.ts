// ── Indexer Module — Plugin Entry ──────────────────────────────
// Web Worker symbol parser with EventBus wiring.
// Events: index-symbol:file-start/done/remove, workspace-done, ready, error

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import { FileEvents } from "@core/events/file.events";
import { IndexSymbolEvents } from "@core/events/index-symbol.events";
import type { IndexerPluginOptions, IndexedSymbol, SymbolQuery, IndexerModuleAPI } from "./types";
import { SymbolTable } from "./symbol-table";
import { parseSymbols } from "./parser";
import { DexiePersistence } from "./persistence";

export type { IndexerPluginOptions, IndexedSymbol, SymbolQuery, SymbolKind, IndexerModuleAPI } from "./types";
export { SymbolTable } from "./symbol-table";
export { parseSymbols } from "./parser";
export { DexiePersistence } from "./persistence";

/**
 * Create the indexer plugin — parses files for symbols,
 * maintains an in-memory symbol table, and persists to IndexedDB.
 */
export function createIndexerPlugin(
  options: IndexerPluginOptions = {},
): { plugin: MonacoPlugin; api: IndexerModuleAPI } {
  const debounceMs = options.debounceMs ?? 500;
  const shouldPersist = options.persist !== false;
  const table = new SymbolTable();
  const disposables: IDisposable[] = [];
  let worker: Worker | null = null;
  let persistence: DexiePersistence | null = null;
  let nextId = 1;
  let ready = false;
  let ctx: PluginContext | null = null;

  // Pending parse callbacks
  const pending = new Map<number, { resolve: (syms: IndexedSymbol[]) => void; reject: (e: Error) => void }>();

  // Debounce timers
  const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function parseViaWorker(path: string, content: string, languageId: string): Promise<IndexedSymbol[]> {
    if (!worker) {
      // Fallback: parse on main thread
      return Promise.resolve(parseSymbols(path, content, languageId));
    }
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker!.postMessage({ type: "parse", id, path, content, languageId });
    });
  }

  async function indexFile(path: string, content: string, languageId: string): Promise<void> {
    ctx?.emit(IndexSymbolEvents.FileStart, { path });

    try {
      const symbols = await parseViaWorker(path, content, languageId);
      table.set(path, symbols);

      if (shouldPersist && persistence) {
        await persistence.save(path, symbols).catch(() => {});
      }

      ctx?.emit(IndexSymbolEvents.FileDone, { path, count: symbols.length });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      ctx?.emit(IndexSymbolEvents.Error, { path, message: msg });
    }
  }

  function removeFile(path: string): void {
    table.remove(path);
    persistence?.remove(path).catch(() => {});
    ctx?.emit(IndexSymbolEvents.FileRemove, { path });
  }

  function debouncedIndex(path: string, content: string, languageId: string): void {
    const existing = debounceTimers.get(path);
    if (existing) clearTimeout(existing);
    debounceTimers.set(
      path,
      setTimeout(() => {
        debounceTimers.delete(path);
        indexFile(path, content, languageId).catch(() => {});
      }, debounceMs),
    );
  }

  const api: IndexerModuleAPI = {
    indexFile,
    removeFile,
    query: (q: SymbolQuery) => table.query(q),
    getFileSymbols: (path: string) => table.getFileSymbols(path),
    isReady: () => ready,
    dispose() {
      // handled by plugin onDispose
    },
  };

  const plugin: MonacoPlugin = {
    id: "indexer-module",
    name: "Symbol Indexer",
    version: "1.0.0",
    description: "Web Worker symbol parser — powers go-to-definition, find-references, workspace symbol search",
    dependencies: ["fs-module"],

    async onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      // Try to create a Web Worker for off-thread parsing
      try {
        worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
        worker.onmessage = (event: MessageEvent) => {
          const msg = event.data as { type: string; id: number; path?: string; symbols?: IndexedSymbol[]; message?: string };
          const p = pending.get(msg.id);
          if (!p) return;
          pending.delete(msg.id);
          if (msg.type === "parsed" && msg.symbols) {
            p.resolve(msg.symbols);
          } else {
            p.reject(new Error(msg.message ?? "Parse failed"));
          }
        };
        worker.onerror = () => {
          // Worker failed to load — fall back to main thread
          worker?.terminate();
          worker = null;
        };
      } catch {
        // Workers not available — parse on main thread
        worker = null;
      }

      // Init persistence
      if (shouldPersist) {
        try {
          persistence = new DexiePersistence(options.dbName);
          await persistence.init();

          // Load cached symbols
          const cached = await persistence.loadAll();
          table.loadBulk(cached);
        } catch {
          persistence = null;
        }
      }

      // ── Wire EventBus: index on file read ──────────────
      disposables.push(
        ctx.on(FileEvents.Read, (data) => {
          const { path, data: content } = data as { path: string; data: Uint8Array };
          const lang = guessLanguage(path);
          if (shouldIndex(lang)) {
            const text = new TextDecoder().decode(content);
            debouncedIndex(path, text, lang);
          }
        }),
      );

      // ── Wire: remove symbols on file delete ────────────
      disposables.push(
        ctx.on(FileEvents.Deleted, (data) => {
          const { path } = data as { path: string };
          removeFile(path);
        }),
      );

      // ── Wire: re-index on rename/move ──────────────────
      disposables.push(
        ctx.on(FileEvents.Renamed, (data) => {
          const { from, to } = data as { from: string; to: string };
          table.rename(from, to);
          persistence?.remove(from).catch(() => {});
          const symbols = table.getFileSymbols(to);
          if (symbols.length > 0) {
            persistence?.save(to, symbols).catch(() => {});
          }
        }),
      );

      disposables.push(
        ctx.on(FileEvents.Moved, (data) => {
          const { from, to } = data as { from: string; to: string };
          table.rename(from, to);
          persistence?.remove(from).catch(() => {});
          const symbols = table.getFileSymbols(to);
          if (symbols.length > 0) {
            persistence?.save(to, symbols).catch(() => {});
          }
        }),
      );

      ready = true;
      ctx.emit(IndexSymbolEvents.Ready, { fileCount: table.fileCount, symbolCount: table.symbolCount });
    },

    onDispose() {
      for (const d of disposables) d.dispose();
      disposables.length = 0;
      for (const timer of debounceTimers.values()) clearTimeout(timer);
      debounceTimers.clear();
      for (const p of pending.values()) p.reject(new Error("Disposed"));
      pending.clear();

      worker?.terminate();
      worker = null;
      persistence?.dispose();
      persistence = null;
      table.clear();
      ready = false;
      ctx = null;
    },
  };

  return { plugin, api };
}

// ── Helpers ───────────────────────────────────────────────────

/** Guess language from file extension */
function guessLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescriptreact",
    js: "javascript",
    jsx: "javascriptreact",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    lua: "lua",
    zig: "zig",
  };
  return map[ext] ?? ext;
}

/** Check if a language should be indexed */
function shouldIndex(lang: string): boolean {
  // Skip binary/data formats
  const skip = new Set(["png", "jpg", "jpeg", "gif", "webp", "ico", "svg", "woff", "woff2", "ttf", "eot", "mp3", "mp4", "zip", "tar", "gz", "pdf"]);
  return !skip.has(lang);
}
