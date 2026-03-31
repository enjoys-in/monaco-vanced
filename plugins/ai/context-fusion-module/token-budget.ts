// ── Token Budget ───────────────────────────────────────────
// Priority-based token budget enforcement.

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface BudgetEntry {
  id: string;
  priority: number;
  text: string;
  tokens: number;
}

/**
 * Fits entries into a token budget, prioritizing lower priority numbers.
 * Returns the entries that fit and whether any were truncated.
 */
export function fitBudget(
  entries: BudgetEntry[],
  budget: number,
): { fitted: BudgetEntry[]; truncated: boolean } {
  const sorted = [...entries].sort((a, b) => a.priority - b.priority);
  const fitted: BudgetEntry[] = [];
  let used = 0;
  let truncated = false;

  for (const entry of sorted) {
    if (used + entry.tokens <= budget) {
      fitted.push(entry);
      used += entry.tokens;
    } else {
      const remaining = budget - used;
      if (remaining > 50) {
        // Truncate this entry to fit
        const charLimit = remaining * 4;
        fitted.push({
          ...entry,
          text: entry.text.slice(0, charLimit) + "\n... (truncated)",
          tokens: remaining,
        });
        truncated = true;
      } else {
        truncated = true;
      }
      break;
    }
  }

  return { fitted, truncated };
}
