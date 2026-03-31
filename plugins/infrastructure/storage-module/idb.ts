// ── Storage Module — IndexedDB Backend ─────────────────────────

import type { StorageEntry, StorageDriver } from "./types";

const DB_VERSION = 1;
const STORE_NAME = "kv";

export class IDBStorage implements StorageDriver {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private readonly dbName: string;

  constructor(namespace = "monaco-vanced-storage") {
    this.dbName = namespace;
  }

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.dbPromise;
  }

  private async tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.openDB();
    return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  }

  private wrap<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(key: string): Promise<StorageEntry | undefined> {
    const store = await this.tx("readonly");
    const entry = await this.wrap<StorageEntry | undefined>(store.get(key));
    if (!entry) return undefined;
    // Check TTL
    if (entry.ttl && Date.now() > entry.createdAt + entry.ttl) {
      await this.remove(key);
      return undefined;
    }
    return entry;
  }

  async set(entry: StorageEntry): Promise<void> {
    const store = await this.tx("readwrite");
    await this.wrap(store.put(entry));
  }

  async remove(key: string): Promise<void> {
    const store = await this.tx("readwrite");
    await this.wrap(store.delete(key));
  }

  async has(key: string): Promise<boolean> {
    const entry = await this.get(key);
    return entry !== undefined;
  }

  async keys(): Promise<string[]> {
    const store = await this.tx("readonly");
    return this.wrap(store.getAllKeys()) as Promise<string[]>;
  }

  async clear(): Promise<void> {
    const store = await this.tx("readwrite");
    await this.wrap(store.clear());
  }

  async size(): Promise<number> {
    const store = await this.tx("readonly");
    return this.wrap(store.count());
  }

  async close(): Promise<void> {
    if (this.dbPromise) {
      const db = await this.dbPromise;
      db.close();
      this.dbPromise = null;
    }
  }
}
