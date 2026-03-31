// ── Performance Module — Types ────────────────────────────────

import type { IDisposable } from "@core/types";

export interface PerfMark {
  name: string;
  startTime: number;
  duration?: number;
}

export interface PerfBudget {
  name: string;
  limitMs: number;
  action: "warn" | "error" | "callback";
}

export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  ttl?: number;
  accessCount: number;
}

export type SchedulerPriority = "high" | "normal" | "low" | "idle";

export interface PerformanceConfig {
  memoryWarningMB?: number;
  longTaskMs?: number;
}

export interface MemoryUsage {
  usedMB: number;
  totalMB: number;
  percent: number;
}

export interface BudgetViolation {
  name: string;
  limitMs: number;
  actualMs: number;
  timestamp: number;
}

export interface PerformanceModuleAPI {
  debounce(key: string, fn: () => void, ms: number): void;
  throttle(key: string, fn: () => void, ms: number): void;
  schedule(fn: () => void | Promise<void>, priority: SchedulerPriority): void;
  mark(name: string): void;
  measure(name: string, startMark: string, endMark?: string): PerfMark | null;
  getMemoryUsage(): MemoryUsage;
  setBudget(budget: PerfBudget): void;
  checkBudget(name: string, duration: number): boolean;
  onMemoryWarning(handler: (data?: unknown) => void): IDisposable;
}
