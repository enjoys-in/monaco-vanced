// ── Context Builder ────────────────────────────────────────
// Gathers editor content, terminal output, file history,
// and symbol info into a context object for AI requests.

export interface ContextSource {
  readonly id: string;
  readonly priority: number;
  readonly content: string;
  readonly tokenEstimate: number;
}

export interface BuiltContext {
  readonly sources: ContextSource[];
  readonly totalTokens: number;
  readonly trimmed: boolean;
}

/**
 * Estimate token count using rough 4-chars-per-token heuristic.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Build a context object from multiple sources within a token budget.
 * Sources are sorted by priority (lower = more important, never trimmed first).
 */
export function buildContext(
  sources: ContextSource[],
  tokenBudget: number,
): BuiltContext {
  // Sort by priority ascending (most important first)
  const sorted = [...sources].sort((a, b) => a.priority - b.priority);

  const included: ContextSource[] = [];
  let totalTokens = 0;
  let trimmed = false;

  for (const source of sorted) {
    if (totalTokens + source.tokenEstimate <= tokenBudget) {
      included.push(source);
      totalTokens += source.tokenEstimate;
    } else {
      // Try to fit a truncated version
      const remaining = tokenBudget - totalTokens;
      if (remaining > 50) {
        const truncatedContent = source.content.slice(0, remaining * 4);
        included.push({
          ...source,
          content: truncatedContent + "\n...(truncated)",
          tokenEstimate: remaining,
        });
        totalTokens += remaining;
        trimmed = true;
      } else {
        trimmed = true;
      }
    }
  }

  return { sources: included, totalTokens, trimmed };
}

/**
 * Create a context source from editor content.
 */
export function createEditorSource(
  filePath: string,
  content: string,
  language: string,
): ContextSource {
  return {
    id: `editor:${filePath}`,
    priority: 1,
    content: `// File: ${filePath} (${language})\n${content}`,
    tokenEstimate: estimateTokens(content) + 10,
  };
}

/**
 * Create a context source from selected text.
 */
export function createSelectionSource(
  selectedText: string,
  filePath: string,
): ContextSource {
  return {
    id: `selection:${filePath}`,
    priority: 0, // Highest priority — never trimmed
    content: `// Selected code:\n${selectedText}`,
    tokenEstimate: estimateTokens(selectedText) + 5,
  };
}
