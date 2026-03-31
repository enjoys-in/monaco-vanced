// ── Storage Module — Session/Local Storage Backend ─────────────

import type { StorageEntry, StorageDriver } from "./types";

export class SessionStorage implements StorageDriver {
  private readonly prefix: string;
  private readonly backend: Storage;

  constructor(namespace = "mv-store", useSession = false) {
    this.prefix = namespace;
    this.backend = useSession ? sessionStorage : localStorage;
  }

  private fullKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async get(key: string): Promise<StorageEntry | undefined> {
    const raw = this.backend.getItem(this.fullKey(key));
    if (!raw) return undefined;
    try {
      const entry = JSON.parse(raw) as StorageEntry;
      // Check TTL
      if (entry.ttl && Date.now() > entry.createdAt + entry.ttl) {
        this.backend.removeItem(this.fullKey(key));
        return undefined;
      }
      return entry;
    } catch {
      return undefined;
    }
  }

  async set(entry: StorageEntry): Promise<void> {
    this.backend.setItem(this.fullKey(entry.key), JSON.stringify(entry));
  }

  async remove(key: string): Promise<void> {
    this.backend.removeItem(this.fullKey(key));
  }

  async has(key: string): Promise<boolean> {
    return this.backend.getItem(this.fullKey(key)) !== null;
  }

  async keys(): Promise<string[]> {
    const result: string[] = [];
    const prefixWithColon = `${this.prefix}:`;
    for (let i = 0; i < this.backend.length; i++) {
      const k = this.backend.key(i);
      if (k?.startsWith(prefixWithColon)) {
        result.push(k.slice(prefixWithColon.length));
      }
    }
    return result;
  }

  async clear(): Promise<void> {
    const keysToRemove: string[] = [];
    const prefixWithColon = `${this.prefix}:`;
    for (let i = 0; i < this.backend.length; i++) {
      const k = this.backend.key(i);
      if (k?.startsWith(prefixWithColon)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => this.backend.removeItem(k));
  }

  async size(): Promise<number> {
    const k = await this.keys();
    return k.length;
  }
}
