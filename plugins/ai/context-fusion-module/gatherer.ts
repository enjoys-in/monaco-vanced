// ── Gatherer ───────────────────────────────────────────────
// Assembles context from multiple sources with token budget.

import type { FusionResult, FusionStrategy } from "./types";
import { SourceRegistry } from "./sources";
import { estimateTokens, fitBudget, type BudgetEntry } from "./token-budget";

export class Gatherer {
  constructor(
    private sourceRegistry: SourceRegistry,
    private defaultBudget: number,
  ) {}

  async gather(strategy: FusionStrategy): Promise<FusionResult> {
    const sources = this.sourceRegistry.getByIds(strategy.sources);
    const budget = strategy.tokenBudget || this.defaultBudget;

    const entries: BudgetEntry[] = [];

    for (const source of sources) {
      try {
        const text = await source.gather();
        if (text) {
          entries.push({
            id: source.id,
            priority: source.priority,
            text,
            tokens: estimateTokens(text),
          });
        }
      } catch {
        // Skip failed sources
      }
    }

    const { fitted, truncated } = fitBudget(entries, budget);

    const text = fitted.map((e) => `### ${e.id}\n${e.text}`).join("\n\n");
    const tokenCount = fitted.reduce((sum, e) => sum + e.tokens, 0);
    const sourcesUsed = fitted.map((e) => e.id);

    return { text, tokenCount, sourcesUsed, truncated };
  }
}
