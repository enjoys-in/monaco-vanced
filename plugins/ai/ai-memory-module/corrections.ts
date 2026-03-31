// ── Corrections ────────────────────────────────────────────
// Tracks user edit patterns → learns common corrections.

import type { Correction } from "./types";
import { PersistentStore } from "./store";

export class CorrectionStore {
  private store: PersistentStore<Correction>;

  constructor(persistKey: string, maxCorrections = 200) {
    this.store = new PersistentStore<Correction>(persistKey, maxCorrections);
  }

  record(original: string, corrected: string, filePath: string): Correction {
    const pattern = `${original} → ${corrected}`;
    const existing = this.store.find((c) => c.pattern === pattern);

    if (existing) {
      const updated: Correction = { ...existing, count: existing.count + 1 };
      this.store.update((c) => c.pattern === pattern, () => updated);
      return updated;
    }

    const correction: Correction = {
      id: `corr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      original,
      corrected,
      filePath,
      pattern,
      count: 1,
      createdAt: Date.now(),
    };
    this.store.add(correction);
    return correction;
  }

  getAll(): Correction[] {
    return this.store.getAll();
  }

  getFrequent(limit = 10): Correction[] {
    return this.store.getAll().sort((a, b) => b.count - a.count).slice(0, limit);
  }

  clear(): void {
    this.store.clear();
  }
}
