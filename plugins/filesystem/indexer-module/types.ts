// ── Indexer Module — Shared Types ─────────────────────────────
// Web Worker symbol parser — powers go-to-definition, find-references,
// workspace symbol search. See context/modules-core.txt #9

import type { IDisposable } from "@core/types";

// ── Symbol kinds ──────────────────────────────────────────────

export type SymbolKind =
  | "file" | "module" | "namespace" | "package"
  | "class" | "method" | "property" | "field"
  | "constructor" | "enum" | "interface" | "function"
  | "variable" | "constant" | "string" | "number"
  | "boolean" | "array" | "object" | "key"
  | "null" | "enumMember" | "struct" | "event"
  | "operator" | "typeParameter";

// ── Indexed symbol ────────────────────────────────────────────

export interface IndexedSymbol {
  name: string;
  kind: SymbolKind;
  path: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  containerName?: string;
  detail?: string;
}

// ── Symbol query ──────────────────────────────────────────────

export interface SymbolQuery {
  /** Name or partial name to search */
  query: string;
  /** Filter by kind */
  kind?: SymbolKind | SymbolKind[];
  /** Scope to a specific file */
  path?: string;
  /** Maximum results */
  limit?: number;
}

// ── Parser request/response (worker messages) ─────────────────

export interface ParseRequest {
  type: "parse";
  id: number;
  path: string;
  content: string;
  languageId: string;
}

export interface ParseResponse {
  type: "parsed";
  id: number;
  path: string;
  symbols: IndexedSymbol[];
}

export interface RemoveRequest {
  type: "remove";
  path: string;
}

export type WorkerMessage = ParseRequest | RemoveRequest;
export type WorkerResponse = ParseResponse | { type: "error"; id: number; message: string };

// ── Indexer module API ────────────────────────────────────────

export interface IndexerModuleAPI {
  /** Index a single file */
  indexFile(path: string, content: string, languageId: string): Promise<void>;
  /** Remove symbols for a file */
  removeFile(path: string): void;
  /** Query the symbol table */
  query(q: SymbolQuery): IndexedSymbol[];
  /** Get all symbols in a file */
  getFileSymbols(path: string): IndexedSymbol[];
  /** Check if the indexer is ready (initial scan complete) */
  isReady(): boolean;
  /** Dispose worker and clear table */
  dispose(): void;
}

// ── Persistence layer ─────────────────────────────────────────

export interface IndexPersistence extends IDisposable {
  save(path: string, symbols: IndexedSymbol[]): Promise<void>;
  load(path: string): Promise<IndexedSymbol[] | null>;
  loadAll(): Promise<Map<string, IndexedSymbol[]>>;
  remove(path: string): Promise<void>;
  clear(): Promise<void>;
}

// ── Plugin options ────────────────────────────────────────────

export interface IndexerPluginOptions {
  /** Languages to index (default: all) */
  languages?: string[];
  /** Max files to index at init (default: 5000) */
  maxFiles?: number;
  /** Debounce delay for re-indexing on file change (ms, default: 500) */
  debounceMs?: number;
  /** Enable persistence via IndexedDB (default: true) */
  persist?: boolean;
  /** IndexedDB database name */
  dbName?: string;
}
