// ── Project Facts ──────────────────────────────────────────
// Convention/tooling/endpoint facts auto-learned from code.

import type { ProjectFact } from "./types";
import { PersistentStore } from "./store";

export class ProjectFactStore {
  private store: PersistentStore<ProjectFact>;

  constructor(persistKey: string, maxFacts = 300) {
    this.store = new PersistentStore<ProjectFact>(persistKey, maxFacts);
  }

  learn(key: string, value: string, category: ProjectFact["category"] = "custom", confidence = 0.8): ProjectFact {
    const now = Date.now();
    const existing = this.store.find((f) => f.key === key);

    if (existing) {
      const updated: ProjectFact = {
        ...existing,
        value,
        category,
        confidence: Math.min(1, existing.confidence + 0.05),
        updatedAt: now,
      };
      this.store.update((f) => f.key === key, () => updated);
      return updated;
    }

    const fact: ProjectFact = {
      id: `fact-${now}-${Math.random().toString(36).slice(2, 8)}`,
      key,
      value,
      category,
      confidence,
      createdAt: now,
      updatedAt: now,
    };
    this.store.add(fact);
    return fact;
  }

  getAll(): ProjectFact[] {
    return this.store.getAll();
  }

  getByCategory(category: ProjectFact["category"]): ProjectFact[] {
    return this.store.filter((f) => f.category === category);
  }

  clear(): void {
    this.store.clear();
  }
}
