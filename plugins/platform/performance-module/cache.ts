// ── Performance Module — MultiLayerCache ──────────────────────

import type { CacheEntry } from "./types";

export class MultiLayerCache<T> {
  private readonly memoryLayer = new Map<string, CacheEntry<T>>();
  private readonly dbName: string;

  constructor(dbName = "perf-cache") {
    this.dbName = dbName;
  }

  async get(key: string): Promise<T | undefined> {
    // Layer 1: Memory
    const mem = this.memoryLayer.get(key);
    if (mem) {
      if (mem.ttl && Date.now() - mem.createdAt > mem.ttl) {
        this.memoryLayer.delete(key);
      } else {
        mem.accessCount++;
        return mem.value;
      }
    }

    // Layer 2: IndexedDB
    try {
      const idb = await this.idbGet(key);
      if (idb !== undefined) {
        this.memoryLayer.set(key, {
          value: idb,
          createdAt: Date.now(),
          accessCount: 1,
        });
        return idb;
      }
    } catch {}

    return undefined;
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      value,
      createdAt: Date.now(),
      ttl,
      accessCount: 0,
    };
    this.memoryLayer.set(key, entry);

    try {
      await this.idbSet(key, value);
    } catch {}
  }

  has(key: string): boolean {
    const mem = this.memoryLayer.get(key);
    if (!mem) return false;
    if (mem.ttl && Date.now() - mem.createdAt > mem.ttl) {
      this.memoryLayer.delete(key);
      return false;
    }
    return true;
  }

  invalidate(key: string): void {
    this.memoryLayer.delete(key);
    this.idbDelete(key).catch(() => {});
  }

  clear(): void {
    this.memoryLayer.clear();
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore("cache");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private async idbGet(key: string): Promise<T | undefined> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("cache", "readonly");
      const req = tx.objectStore("cache").get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  }

  private async idbSet(key: string, value: T): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("cache", "readwrite");
      tx.objectStore("cache").put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async idbDelete(key: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("cache", "readwrite");
      tx.objectStore("cache").delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
