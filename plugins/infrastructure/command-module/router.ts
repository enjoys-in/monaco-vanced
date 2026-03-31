// ── Command Module — Command Router ───────────────────────────
// Middleware chain: before → handler → after, with history tracking.

import type { CommandHistoryEntry } from "./types";
import { CommandRegistry } from "./registry";
import { WhenClauseEvaluator } from "./when-clause";

export class CommandRouter {
  private readonly registry: CommandRegistry;
  private readonly whenClause: WhenClauseEvaluator;
  private readonly history: CommandHistoryEntry[] = [];
  private readonly maxHistory: number;
  private readonly beforeHooks: Array<(data?: unknown) => void> = [];
  private readonly afterHooks: Array<(data?: unknown) => void> = [];

  constructor(registry: CommandRegistry, maxHistory = 100) {
    this.registry = registry;
    this.whenClause = new WhenClauseEvaluator();
    this.maxHistory = maxHistory;
  }

  addBeforeHook(hook: (data?: unknown) => void): () => void {
    this.beforeHooks.push(hook);
    return () => {
      const idx = this.beforeHooks.indexOf(hook);
      if (idx >= 0) this.beforeHooks.splice(idx, 1);
    };
  }

  addAfterHook(hook: (data?: unknown) => void): () => void {
    this.afterHooks.push(hook);
    return () => {
      const idx = this.afterHooks.indexOf(hook);
      if (idx >= 0) this.afterHooks.splice(idx, 1);
    };
  }

  async execute(
    id: string,
    args: unknown[] = [],
    context: Record<string, unknown> = {},
  ): Promise<void> {
    const cmd = this.registry.get(id);
    if (!cmd) throw new Error(`Command not found: ${id}`);

    // Evaluate when clause
    if (cmd.when && !this.whenClause.evaluate(cmd.when, context)) {
      return;
    }

    const payload = { commandId: id, args };

    // Run before hooks
    for (const hook of this.beforeHooks) {
      try { hook(payload); } catch (e) { console.warn("[command-router] before hook error:", e); }
    }

    // Execute command
    await cmd.handler(...args);

    // Track history
    this.history.unshift({ id, args, timestamp: Date.now() });
    if (this.history.length > this.maxHistory) this.history.pop();

    // Run after hooks
    for (const hook of this.afterHooks) {
      try { hook(payload); } catch (e) { console.warn("[command-router] after hook error:", e); }
    }
  }

  getHistory(): CommandHistoryEntry[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history.length = 0;
  }
}
