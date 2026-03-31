// ── Strategies ─────────────────────────────────────────────
// Built-in fusion strategies for common AI tasks.

import type { FusionStrategy } from "./types";

export const STRATEGIES: Record<string, FusionStrategy> = {
  chat: {
    id: "chat",
    sources: ["editor.current", "editor.selection", "memory", "knowledge-graph"],
    tokenBudget: 4000,
  },
  completion: {
    id: "completion",
    sources: ["editor.current", "editor.selection", "related-files"],
    tokenBudget: 2000,
  },
  fix: {
    id: "fix",
    sources: ["editor.current", "diagnostics", "editor.selection"],
    tokenBudget: 3000,
  },
  explain: {
    id: "explain",
    sources: ["editor.selection", "knowledge-graph", "memory"],
    tokenBudget: 3000,
  },
};

export class StrategyRegistry {
  private strategies = new Map<string, FusionStrategy>();

  constructor() {
    for (const [, strategy] of Object.entries(STRATEGIES)) {
      this.strategies.set(strategy.id, strategy);
    }
  }

  register(strategy: FusionStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  get(id: string): FusionStrategy | undefined {
    return this.strategies.get(id);
  }

  getAll(): FusionStrategy[] {
    return Array.from(this.strategies.values());
  }
}
