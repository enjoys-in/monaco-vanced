// ── FS Module — IndexedDB Adapter (Dexie.js) ─────────────────
// Local adapter: stores files as binary blobs in IndexedDB via Dexie.
// See context/fs-connections.txt Section 5e

import type { IDisposable } from "@core/types";
import type {
  AdapterCapabilities,
  DirEntry,
  FileStat,
  IndexedDBAdapterConfig,
  WatchCallback,
} from "../types";
import { BaseAdapter, parentDir } from "../adapter";
import { PollingWatcher } from "../watcher";
import { getDexieDB, closeDexieDB, type MonacoVancedDB, type FileRecord } from "../dexie-db";

/**
 * IndexedDB adapter powered by Dexie.js — stores each file as a record
 * keyed by path. Uses a `directory` index for efficient `list()` queries.
 * No streaming (data is stored as blobs, not streamed).
 */
export class IndexedDBAdapter extends BaseAdapter {
  readonly name = "indexeddb";
  readonly type = "local" as const;
  readonly capabilities: AdapterCapabilities = {
    indexing: true,
    watch: true,
    search: true,
    streaming: false,
    vectorIndex: true,
    symbolGraph: true,
  };

  private db: MonacoVancedDB | null = null;
  private dbName: string;

  constructor(private config: IndexedDBAdapterConfig) {
    super();
    this.dbName = config.dbName ?? "monaco-vanced-fs";
  }

  async init(): Promise<void> {
    this.db = getDexieDB(this.dbName);
    await this.db.open();
  }

  private getDB(): MonacoVancedDB {
    if (!this.db) throw new Error("IndexedDB adapter not initialized. Call init() first.");
    return this.db;
  }

  private normalizePath(path: string): string {
    return "/" + path.split("/").filter(Boolean).join("/");
  }

  // ───── FSAdapter interface ─────

  async read(path: string): Promise<Uint8Array> {
    const key = this.normalizePath(path);
    const record = await this.getDB().files.get(key);
    if (!record || record.isDirectory) {
      throw new Error(`File not found: ${key}`);
    }
    return record.data;
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    const key = this.normalizePath(path);
    const now = Date.now();
    const existing = await this.getDB().files.get(key);
    const record: FileRecord = {
      path: key,
      directory: parentDir(key),
      data,
      size: data.byteLength,
      modified: now,
      created: existing?.created ?? now,
      isDirectory: false,
    };
    await this.getDB().files.put(record);
  }

  async delete(path: string, opts?: { recursive?: boolean }): Promise<void> {
    const key = this.normalizePath(path);
    const db = this.getDB();

    if (opts?.recursive) {
      const prefix = key.endsWith("/") ? key : key + "/";
      // Delete the entry itself + all children
      await db.transaction("rw", db.files, async () => {
        const allKeys = await db.files.toCollection().primaryKeys();
        const toDelete = allKeys.filter(
          (k) => k === key || (k as string).startsWith(prefix),
        );
        await db.files.bulkDelete(toDelete);
      });
    } else {
      await db.files.delete(key);
    }
  }

  async rename(from: string, to: string): Promise<void> {
    const fromKey = this.normalizePath(from);
    const toKey = this.normalizePath(to);
    const db = this.getDB();

    await db.transaction("rw", db.files, async () => {
      const record = await db.files.get(fromKey);
      if (!record) throw new Error(`File not found: ${fromKey}`);

      await db.files.delete(fromKey);
      await db.files.put({ ...record, path: toKey, directory: parentDir(toKey) });
    });
  }

  async list(dir: string): Promise<DirEntry[]> {
    const key = this.normalizePath(dir);
    const records = await this.getDB().files
      .where("directory")
      .equals(key)
      .toArray();

    return records.map((r) => ({
      name: r.path.split("/").pop()!,
      path: r.path,
      isDirectory: r.isDirectory,
      size: r.size,
      modified: r.modified,
    }));
  }

  async mkdir(path: string): Promise<void> {
    const key = this.normalizePath(path);
    const now = Date.now();
    const record: FileRecord = {
      path: key,
      directory: parentDir(key),
      data: new Uint8Array(0),
      size: 0,
      modified: now,
      created: now,
      isDirectory: true,
    };
    await this.getDB().files.put(record);
  }

  async exists(path: string): Promise<boolean> {
    const key = this.normalizePath(path);
    const count = await this.getDB().files
      .where("path")
      .equals(key)
      .count();
    return count > 0;
  }

  async stat(path: string): Promise<FileStat> {
    const key = this.normalizePath(path);
    const record = await this.getDB().files.get(key);
    if (!record) throw new Error(`Not found: ${key}`);
    return {
      size: record.size,
      modified: record.modified,
      created: record.created,
      isDirectory: record.isDirectory,
    };
  }

  watch(glob: string, cb: WatchCallback): IDisposable {
    const watcher = new PollingWatcher(this, glob, cb, this.config.pollInterval ?? 2000);
    watcher.start();
    return watcher;
  }

  dispose(): void {
    if (this.db) {
      closeDexieDB(this.dbName);
      this.db = null;
    }
  }
}
