// ── Performance Module — BudgetManager ────────────────────────

import type { PerfBudget, BudgetViolation } from "./types";

export class BudgetManager {
  private readonly budgets = new Map<string, PerfBudget>();
  private readonly violations: BudgetViolation[] = [];

  setBudget(budget: PerfBudget): void {
    this.budgets.set(budget.name, budget);
  }

  checkBudget(name: string, duration: number): boolean {
    const budget = this.budgets.get(name);
    if (!budget) return true;

    if (duration > budget.limitMs) {
      this.violations.push({
        name,
        limitMs: budget.limitMs,
        actualMs: duration,
        timestamp: Date.now(),
      });
      return false;
    }
    return true;
  }

  getViolations(): readonly BudgetViolation[] {
    return this.violations;
  }

  getBudget(name: string): PerfBudget | undefined {
    return this.budgets.get(name);
  }

  clearViolations(): void {
    this.violations.length = 0;
  }

  removeBudget(name: string): void {
    this.budgets.delete(name);
  }
}
