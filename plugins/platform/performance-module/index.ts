// ── Performance Module — Plugin Entry ─────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { PerformanceConfig, PerformanceModuleAPI, PerfMark, PerfBudget, MemoryUsage } from "./types";
import { DebouncerRegistry } from "./debounce";
import { PriorityScheduler } from "./scheduler";
import { MemoryMonitor } from "./memory";
import { PerfMarks } from "./marks";
import { BudgetManager } from "./budgets";
import { PerfDashboard } from "./dashboard";

export type {
  PerformanceConfig, PerformanceModuleAPI, PerfMark, PerfBudget,
  CacheEntry, SchedulerPriority, MemoryUsage, BudgetViolation,
} from "./types";
export { DebouncerRegistry } from "./debounce";
export { PriorityScheduler } from "./scheduler";
export { MemoryMonitor } from "./memory";
export { PerfMarks } from "./marks";
export { MultiLayerCache } from "./cache";
export { LRUCache } from "./lru";
export { TTLTracker } from "./ttl";
export { HeuristicEngine, type HeuristicContext } from "./heuristics";
export { DEFAULT_RULES, type Rule } from "./rules";
export { BudgetManager } from "./budgets";
export { PerfDashboard, type DashboardMetrics } from "./dashboard";

export function createPerformancePlugin(config: PerformanceConfig = {}): {
  plugin: MonacoPlugin;
  api: PerformanceModuleAPI;
} {
  const debouncer = new DebouncerRegistry();
  const scheduler = new PriorityScheduler();
  const memoryMonitor = new MemoryMonitor(config.memoryWarningMB);
  const perfMarks = new PerfMarks();
  const budgetManager = new BudgetManager();
  const memoryWarningHandlers: Array<(data?: unknown) => void> = [];
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;

  const dashboard = new PerfDashboard({
    getMemory: () => memoryMonitor.getUsage(),
    getViolations: () => budgetManager.getViolations(),
    getMarkCount: () => perfMarks.getEntries().length,
  });

  const longTaskMs = config.longTaskMs ?? 50;

  const api: PerformanceModuleAPI = {
    debounce(key: string, fn: () => void, ms: number): void {
      debouncer.debounce(key, fn, ms);
    },

    throttle(key: string, fn: () => void, ms: number): void {
      debouncer.throttle(key, fn, ms);
    },

    schedule(fn: () => void | Promise<void>, priority) {
      scheduler.schedule(fn, priority);
    },

    mark(name: string): void {
      perfMarks.mark(name);
    },

    measure(name: string, startMark: string, endMark?: string): PerfMark | null {
      const result = perfMarks.measure(name, startMark, endMark);
      if (result?.duration && result.duration > longTaskMs) {
        ctx?.emit("perf:long-task", { name, duration: result.duration });
        dashboard.recordLongTask();
      }
      return result;
    },

    getMemoryUsage(): MemoryUsage {
      return memoryMonitor.getUsage();
    },

    setBudget(budget: PerfBudget): void {
      budgetManager.setBudget(budget);
    },

    checkBudget(name: string, duration: number): boolean {
      return budgetManager.checkBudget(name, duration);
    },

    onMemoryWarning(handler: (data?: unknown) => void): IDisposable {
      memoryWarningHandlers.push(handler);
      return {
        dispose() {
          const idx = memoryWarningHandlers.indexOf(handler);
          if (idx !== -1) memoryWarningHandlers.splice(idx, 1);
        },
      };
    },
  };

  const plugin: MonacoPlugin = {
    id: "platform.performance",
    name: "Performance Module",
    version: "1.0.0",
    description: "Debouncing, scheduling, memory monitoring, performance marks, budgets, and caching",

    onMount(_ctx: PluginContext) {
      ctx = _ctx;

      const removeWarning = memoryMonitor.onWarning((usage) => {
        ctx?.emit("perf:memory-warning", usage);
        memoryWarningHandlers.forEach((h) => {
          try { h(usage); } catch {}
        });
      });
      disposables.push({ dispose: removeWarning });

      memoryMonitor.startMonitoring();
    },

    onDispose() {
      memoryMonitor.stopMonitoring();
      debouncer.cancelAll();
      perfMarks.clear();
      disposables.forEach((d) => d.dispose());
      memoryWarningHandlers.length = 0;
      ctx = null;
    },
  };

  return { plugin, api };
}
