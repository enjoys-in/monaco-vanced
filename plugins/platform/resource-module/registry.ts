// ── Resource Module — ResourceRegistry ────────────────────────

import type { IDisposable } from "@core/types";
import type { ResourceEntry } from "./types";

export class ResourceRegistry {
  private readonly entries = new Map<string, ResourceEntry>();

  register(
    type: string,
    key: string,
    disposable: IDisposable,
    opts?: { owner?: string; group?: string },
  ): void {
    if (this.entries.has(key)) {
      // Increment ref count for existing
      this.entries.get(key)!.refCount++;
      return;
    }

    this.entries.set(key, {
      type,
      key,
      disposable,
      owner: opts?.owner,
      group: opts?.group,
      refCount: 1,
      createdAt: Date.now(),
    });
  }

  dispose(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;

    try { entry.disposable.dispose(); } catch {}
    this.entries.delete(key);
    return true;
  }

  get(key: string): ResourceEntry | undefined {
    return this.entries.get(key);
  }

  addRef(key: string): void {
    const entry = this.entries.get(key);
    if (entry) entry.refCount++;
  }

  releaseRef(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;
    entry.refCount--;
    if (entry.refCount <= 0) {
      this.dispose(key);
      return true;
    }
    return false;
  }

  getByGroup(group: string): ResourceEntry[] {
    return Array.from(this.entries.values()).filter((e) => e.group === group);
  }

  getAll(): ResourceEntry[] {
    return Array.from(this.entries.values());
  }

  disposeAll(): void {
    for (const entry of this.entries.values()) {
      try { entry.disposable.dispose(); } catch {}
    }
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
