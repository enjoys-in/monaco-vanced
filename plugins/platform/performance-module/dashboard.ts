// ── Performance Module — PerfDashboard ────────────────────────

import type { MemoryUsage, BudgetViolation } from "./types";

export interface DashboardMetrics {
  memory: MemoryUsage;
  marks: number;
  violations: readonly BudgetViolation[];
  longTasks: number;
  uptime: number;
}

export class PerfDashboard {
  private readonly startTime = Date.now();
  private longTaskCount = 0;
  private getMemory: () => MemoryUsage;
  private getViolations: () => readonly BudgetViolation[];
  private getMarkCount: () => number;

  constructor(deps: {
    getMemory: () => MemoryUsage;
    getViolations: () => readonly BudgetViolation[];
    getMarkCount: () => number;
  }) {
    this.getMemory = deps.getMemory;
    this.getViolations = deps.getViolations;
    this.getMarkCount = deps.getMarkCount;
  }

  recordLongTask(): void {
    this.longTaskCount++;
  }

  getMetrics(): DashboardMetrics {
    return {
      memory: this.getMemory(),
      marks: this.getMarkCount(),
      violations: this.getViolations(),
      longTasks: this.longTaskCount,
      uptime: Date.now() - this.startTime,
    };
  }
}
