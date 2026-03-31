// ── Indexer Module — Persistence Layer (Dexie.js) ─────────────
// Stores symbol index in IndexedDB via Dexie for fast cold starts.

import type { IndexPersistence, IndexedSymbol } from "./types";
import { getDexieDB, closeDexieDB, type MonacoVancedDB } from "../fs-module/dexie-db";

/**
 * Dexie-backed persistence for the symbol index.
 * Uses the shared MonacoVancedDB singleton's `symbols` table.
 */
export class DexiePersistence implements IndexPersistence {
  private db: MonacoVancedDB | null = null;

  constructor(private dbName: string = "monaco-vanced-index") {}

  async init(): Promise<void> {
    this.db = getDexieDB(this.dbName);
    await this.db.open();
  }

  private getDB(): MonacoVancedDB {
    if (!this.db) throw new Error("Persistence not initialized");
    return this.db;
  }

  async save(path: string, symbols: IndexedSymbol[]): Promise<void> {
    await this.getDB().symbols.put({ path, symbols });
  }

  async load(path: string): Promise<IndexedSymbol[] | null> {
    const record = await this.getDB().symbols.get(path);
    return (record?.symbols as IndexedSymbol[]) ?? null;
  }

  async loadAll(): Promise<Map<string, IndexedSymbol[]>> {
    const records = await this.getDB().symbols.toArray();
    const map = new Map<string, IndexedSymbol[]>();
    for (const r of records) {
      map.set(r.path, r.symbols as IndexedSymbol[]);
    }
    return map;
  }

  async remove(path: string): Promise<void> {
    await this.getDB().symbols.delete(path);
  }

  async clear(): Promise<void> {
    await this.getDB().symbols.clear();
  }

  dispose(): void {
    if (this.db) {
      closeDexieDB(this.dbName);
      this.db = null;
    }
  }
}
