// ── Dexie DB Singleton ────────────────────────────────────────
// Shared Dexie database instance for all IndexedDB consumers.
// Both the FS adapter and indexer persistence use this singleton.

import Dexie, { type EntityTable } from "dexie";

// ── File record shape (fs-module adapter) ─────────────────────

export interface FileRecord {
  path: string;
  directory: string;
  data: Uint8Array;
  size: number;
  modified: number;
  created: number;
  isDirectory: boolean;
}

// ── Symbol record shape (indexer-module persistence) ──────────

export interface SymbolRecord {
  path: string;
  symbols: unknown[]; // IndexedSymbol[] — kept as `unknown` to avoid circular deps
}

// ── Dexie database class ──────────────────────────────────────

class MonacoVancedDB extends Dexie {
  files!: EntityTable<FileRecord, "path">;
  symbols!: EntityTable<SymbolRecord, "path">;

  constructor(dbName: string) {
    super(dbName);

    this.version(1).stores({
      files: "path, directory",
      symbols: "path",
    });
  }
}

// ── Singleton registry ────────────────────────────────────────

const instances = new Map<string, MonacoVancedDB>();

/**
 * Get or create a Dexie database instance by name.
 * Reuses existing instance if already open (singleton per db name).
 */
export function getDexieDB(dbName: string = "monaco-vanced"): MonacoVancedDB {
  let db = instances.get(dbName);
  if (!db) {
    db = new MonacoVancedDB(dbName);
    instances.set(dbName, db);
  }
  return db;
}

/**
 * Close and remove a specific database instance.
 */
export function closeDexieDB(dbName: string): void {
  const db = instances.get(dbName);
  if (db) {
    db.close();
    instances.delete(dbName);
  }
}

/**
 * Close all open database instances.
 */
export function closeAllDexieDBs(): void {
  for (const db of instances.values()) {
    db.close();
  }
  instances.clear();
}

export type { MonacoVancedDB };
