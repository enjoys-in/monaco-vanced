// ── Auto-fix — applies ESLint fixes to source code ──────────
import type { LintMessage, LintFix } from "./types";

/**
 * Apply all auto-fixable lint messages to the source code.
 * Fixes are applied in reverse order (from end to start) to preserve offsets.
 *
 * @param source - Original source code
 * @param messages - Lint messages (only those with .fix are applied)
 * @returns Fixed source code
 */
export function applyFixes(
  source: string,
  messages: LintMessage[],
): string {
  const fixable = messages
    .filter((m): m is LintMessage & { fix: LintFix } => m.fix != null)
    .sort((a, b) => b.fix.range[0] - a.fix.range[0]); // Reverse order

  let result = source;

  for (const msg of fixable) {
    const [start, end] = msg.fix.range;
    if (start >= 0 && end >= start && end <= result.length) {
      result = result.slice(0, start) + msg.fix.text + result.slice(end);
    }
  }

  return result;
}

/**
 * Count how many messages have auto-fixes available.
 */
export function countFixable(messages: LintMessage[]): number {
  return messages.filter((m) => m.fix != null).length;
}