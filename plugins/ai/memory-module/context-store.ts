// ── Context Store ──────────────────────────────────────────
// In-memory + localStorage persistence for AI memory entries.

import type { MemoryEntry } from "./types";

export class ContextStore {
  private entries = new Map<string, MemoryEntry>();
  private maxEntries: number;
  private persistKey: string;

  constructor(maxEntries = 200, persistKey = "monaco-vanced:ai-memory") {
    this.maxEntries = maxEntries;
    this.persistKey = persistKey;
    this.restore();
  }

  store(key: string, value: string, category: MemoryEntry["category"] = "custom", source = "user"): MemoryEntry {
    const existing = this.entries.get(key);
    const now = Date.now();
    const entry: MemoryEntry = {
      id: existing?.id ?? `mem-${now}-${Math.random().toString(36).slice(2, 8)}`,
      key,
      value,
      category,
      source,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.entries.set(key, entry);
    this.enforceLimit();
    this.persist();
    return entry;
  }

  get(key: string): MemoryEntry | undefined {
    return this.entries.get(key);
  }

  getByCategory(category: MemoryEntry["category"]): MemoryEntry[] {
    return Array.from(this.entries.values()).filter((e) => e.category === category);
  }

  getAll(): MemoryEntry[] {
    return Array.from(this.entries.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  remove(key: string): void {
    this.entries.delete(key);
    this.persist();
  }

  clear(): void {
    this.entries.clear();
    this.persist();
  }

  private enforceLimit(): void {
    if (this.entries.size <= this.maxEntries) return;
    const sorted = this.getAll();
    const toRemove = sorted.slice(this.maxEntries);
    for (const entry of toRemove) {
      this.entries.delete(entry.key);
    }
  }

  private persist(): void {
    try {
      const data = Array.from(this.entries.values());
      localStorage.setItem(this.persistKey, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(this.persistKey);
      if (!raw) return;
      const data = JSON.parse(raw) as MemoryEntry[];
      for (const entry of data) {
        this.entries.set(entry.key, entry);
      }
    } catch {
      // ignore
    }
  }

  dispose(): void {
    this.persist();
  }
}
