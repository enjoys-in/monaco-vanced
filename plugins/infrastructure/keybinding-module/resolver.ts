// ── Keybinding Module — Resolver ───────────────────────────────
// Resolves keyboard events to commands with priority: user > extension > default.

import type { KeybindingSource, ResolvedKeybinding } from "./types";
import { parseKeyCombo, matchEvent, normalizeKey } from "./parser";

// Import when-clause evaluator from command module
// When not available, fallback to simple truthy check
function evaluateWhen(expr: string | undefined, context: Record<string, unknown>): boolean {
  if (!expr) return true;
  const trimmed = expr.trim();
  if (!trimmed) return true;
  // Simple evaluation for standalone usage
  if (trimmed.startsWith("!")) {
    return !context[trimmed.slice(1).trim()];
  }
  return Boolean(context[trimmed]);
}

const SOURCE_PRIORITY: Record<KeybindingSource, number> = {
  user: 3,
  extension: 2,
  default: 1,
};

export class KeybindingResolver {
  private bindings: ResolvedKeybinding[] = [];

  setBindings(bindings: ResolvedKeybinding[]): void {
    this.bindings = bindings;
  }

  resolve(
    event: KeyboardEvent,
    context: Record<string, unknown> = {},
  ): ResolvedKeybinding | null {
    const matches: ResolvedKeybinding[] = [];

    for (const binding of this.bindings) {
      const combo = parseKeyCombo(binding.key);
      if (matchEvent(event, combo) && evaluateWhen(binding.when, context)) {
        matches.push(binding);
      }
    }

    if (matches.length === 0) return null;

    // Sort by priority (user > extension > default)
    matches.sort((a, b) => SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source]);
    return matches[0];
  }

  resolveAll(
    event: KeyboardEvent,
    context: Record<string, unknown> = {},
  ): ResolvedKeybinding[] {
    const matches: ResolvedKeybinding[] = [];

    for (const binding of this.bindings) {
      const combo = parseKeyCombo(binding.key);
      if (matchEvent(event, combo) && evaluateWhen(binding.when, context)) {
        matches.push(binding);
      }
    }

    return matches.sort((a, b) => SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source]);
  }

  findByCommand(commandId: string): ResolvedKeybinding[] {
    return this.bindings.filter((b) => b.command === commandId);
  }

  findByKey(key: string): ResolvedKeybinding[] {
    const normalized = normalizeKey(key);
    return this.bindings.filter((b) => normalizeKey(b.key) === normalized);
  }
}
