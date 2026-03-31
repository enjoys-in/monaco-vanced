// ── When Clause Evaluator ──────────────────────────────────
// Evaluates context conditions for menu item visibility.

import type { ContextCondition, MenuItem } from "./types";

/**
 * Evaluate a when-clause string against a context map.
 * Supports basic expressions:
 *   key              → truthy check
 *   !key             → falsy check
 *   key == value     → equality
 *   key != value     → inequality
 *   expr && expr     → AND
 *   expr || expr     → OR
 */
export function evaluateWhenClause(
  when: string,
  context: Record<string, unknown>,
): boolean {
  // Handle OR (lowest precedence)
  if (when.includes("||")) {
    return when.split("||").some((part) => evaluateWhenClause(part.trim(), context));
  }

  // Handle AND
  if (when.includes("&&")) {
    return when.split("&&").every((part) => evaluateWhenClause(part.trim(), context));
  }

  const trimmed = when.trim();

  // Negation
  if (trimmed.startsWith("!")) {
    const key = trimmed.slice(1).trim();
    return !context[key];
  }

  // Inequality
  if (trimmed.includes("!=")) {
    const [key, value] = trimmed.split("!=").map((s) => s.trim());
    return String(context[key!]) !== value;
  }

  // Equality
  if (trimmed.includes("==")) {
    const [key, value] = trimmed.split("==").map((s) => s.trim());
    return String(context[key!]) === value;
  }

  // Simple truthy check
  return Boolean(context[trimmed]);
}

/**
 * Check if a menu item's condition is met.
 */
export function evaluateCondition(
  condition: ContextCondition | undefined,
  evalContext: Record<string, unknown>,
): boolean {
  if (!condition) return true;

  // When clause
  if (condition.when && !evaluateWhenClause(condition.when, evalContext)) {
    return false;
  }

  // Language filter
  if (condition.languages && condition.languages.length > 0) {
    const currentLang = evalContext.language as string | undefined;
    if (!currentLang || !condition.languages.includes(currentLang)) {
      return false;
    }
  }

  // Selection check
  if (condition.hasSelection !== undefined) {
    const hasSelection = Boolean(evalContext.hasSelection);
    if (condition.hasSelection !== hasSelection) {
      return false;
    }
  }

  return true;
}

/**
 * Filter menu items by their conditions.
 */
export function filterByConditions(
  items: MenuItem[],
  evalContext: Record<string, unknown>,
): MenuItem[] {
  return items.filter((item) => evaluateCondition(item.condition, evalContext));
}
