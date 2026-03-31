// ── Offline Queue ──────────────────────────────────────────
// FIFO queue backed by localStorage for offline operations.

import type { QueueEntry } from "./types";

export class OfflineQueue {
  private queue: QueueEntry[] = [];
  private persistKey: string;

  constructor(persistKey = "monaco-vanced:sync-queue") {
    this.persistKey = persistKey;
    this.restore();
  }

  enqueue(uri: string, operation: QueueEntry["operation"], data?: unknown): QueueEntry {
    const entry: QueueEntry = {
      id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      uri,
      operation,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };
    this.queue.push(entry);
    this.persist();
    return entry;
  }

  dequeue(): QueueEntry | undefined {
    const entry = this.queue.shift();
    this.persist();
    return entry;
  }

  peek(): QueueEntry | undefined {
    return this.queue[0];
  }

  getAll(): QueueEntry[] {
    return [...this.queue];
  }

  retry(entry: QueueEntry): void {
    const updated: QueueEntry = { ...entry, retryCount: entry.retryCount + 1 };
    this.queue.push(updated);
    this.persist();
  }

  remove(id: string): void {
    this.queue = this.queue.filter((e) => e.id !== id);
    this.persist();
  }

  get length(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
    this.persist();
  }

  private persist(): void {
    try { localStorage.setItem(this.persistKey, JSON.stringify(this.queue)); } catch { /* ignore */ }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(this.persistKey);
      if (raw) this.queue = JSON.parse(raw) as QueueEntry[];
    } catch { /* ignore */ }
  }
}
