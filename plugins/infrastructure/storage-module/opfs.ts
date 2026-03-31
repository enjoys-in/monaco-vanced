// ── Storage Module — OPFS Backend ──────────────────────────────
// Origin Private File System storage backend.

import type { StorageEntry, StorageDriver } from "./types";

export class OPFSStorage implements StorageDriver {
  private readonly namespace: string;
  private dirHandle: FileSystemDirectoryHandle | null = null;

  constructor(namespace = "monaco-vanced-storage") {
    this.namespace = namespace;
  }

  private async getDir(): Promise<FileSystemDirectoryHandle> {
    if (this.dirHandle) return this.dirHandle;
    const root = await navigator.storage.getDirectory();
    this.dirHandle = await root.getDirectoryHandle(this.namespace, { create: true });
    return this.dirHandle;
  }

  private encodeKey(key: string): string {
    // File-system safe key encoding
    return encodeURIComponent(key).replace(/%/g, "_");
  }

  async get(key: string): Promise<StorageEntry | undefined> {
    try {
      const dir = await this.getDir();
      const fileHandle = await dir.getFileHandle(this.encodeKey(key));
      const file = await fileHandle.getFile();
      const text = await file.text();
      const entry = JSON.parse(text) as StorageEntry;
      // Check TTL
      if (entry.ttl && Date.now() > entry.createdAt + entry.ttl) {
        await this.remove(key);
        return undefined;
      }
      return entry;
    } catch {
      return undefined;
    }
  }

  async set(entry: StorageEntry): Promise<void> {
    const dir = await this.getDir();
    const fileHandle = await dir.getFileHandle(this.encodeKey(entry.key), { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(entry));
    await writable.close();
  }

  async remove(key: string): Promise<void> {
    try {
      const dir = await this.getDir();
      await dir.removeEntry(this.encodeKey(key));
    } catch {
      // File doesn't exist — OK
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const dir = await this.getDir();
      await dir.getFileHandle(this.encodeKey(key));
      return true;
    } catch {
      return false;
    }
  }

  async keys(): Promise<string[]> {
    const dir = await this.getDir();
    const keys: string[] = [];
    for await (const name of (dir as any).keys()) {
      keys.push(decodeURIComponent((name as string).replace(/_/g, "%")));
    }
    return keys;
  }

  async clear(): Promise<void> {
    const dir = await this.getDir();
    const names: string[] = [];
    for await (const name of (dir as any).keys()) {
      names.push(name as string);
    }
    for (const name of names) {
      await dir.removeEntry(name);
    }
  }

  async size(): Promise<number> {
    const k = await this.keys();
    return k.length;
  }
}
