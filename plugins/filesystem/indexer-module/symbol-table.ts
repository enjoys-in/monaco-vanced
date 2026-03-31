// ── Indexer Module — Symbol Table ─────────────────────────────
// In-memory symbol storage with query support.

import type { IndexedSymbol, SymbolQuery } from "./types";

/**
 * In-memory symbol table — maps file paths to their parsed symbols.
 * Supports name-based search with optional kind/path filters.
 */
export class SymbolTable {
  private table = new Map<string, IndexedSymbol[]>();

  /** Set symbols for a file (replaces any existing) */
  set(path: string, symbols: IndexedSymbol[]): void {
    this.table.set(path, symbols);
  }

  /** Remove all symbols for a file */
  remove(path: string): void {
    this.table.delete(path);
  }

  /** Get symbols for a specific file */
  getFileSymbols(path: string): IndexedSymbol[] {
    return this.table.get(path) ?? [];
  }

  /** Check if a file has been indexed */
  has(path: string): boolean {
    return this.table.has(path);
  }

  /** Total number of indexed files */
  get fileCount(): number {
    return this.table.size;
  }

  /** Total number of symbols across all files */
  get symbolCount(): number {
    let count = 0;
    for (const symbols of this.table.values()) {
      count += symbols.length;
    }
    return count;
  }

  /** Query symbols by name, kind, path */
  query(q: SymbolQuery): IndexedSymbol[] {
    const lowerQuery = q.query.toLowerCase();
    const kinds = q.kind
      ? Array.isArray(q.kind) ? q.kind : [q.kind]
      : undefined;
    const limit = q.limit ?? 100;
    const results: IndexedSymbol[] = [];

    const sources = q.path
      ? [this.table.get(q.path) ?? []]
      : this.table.values();

    for (const symbols of sources) {
      for (const sym of symbols) {
        if (!sym.name.toLowerCase().includes(lowerQuery)) continue;
        if (kinds && !kinds.includes(sym.kind)) continue;
        results.push(sym);
        if (results.length >= limit) return results;
      }
    }

    return results;
  }

  /** Rename a file's symbols (after fs rename/move) */
  rename(oldPath: string, newPath: string): void {
    const symbols = this.table.get(oldPath);
    if (!symbols) return;
    this.table.delete(oldPath);
    const updated = symbols.map((s) => ({ ...s, path: newPath }));
    this.table.set(newPath, updated);
  }

  /** Load bulk data (from persistence) */
  loadBulk(data: Map<string, IndexedSymbol[]>): void {
    for (const [path, symbols] of data) {
      this.table.set(path, symbols);
    }
  }

  /** Clear all symbols */
  clear(): void {
    this.table.clear();
  }
}
