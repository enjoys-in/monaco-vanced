// ── Performance Module — MemoryMonitor ────────────────────────

import type { MemoryUsage } from "./types";

export class MemoryMonitor {
  private readonly warningMB: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly warningHandlers: Array<(usage: MemoryUsage) => void> = [];

  constructor(warningMB = 512) {
    this.warningMB = warningMB;
  }

  getUsage(): MemoryUsage {
    const perf = performance as Performance & {
      memory?: { usedJSHeapSize: number; totalJSHeapSize: number };
    };

    if (perf.memory) {
      const usedMB = perf.memory.usedJSHeapSize / (1024 * 1024);
      const totalMB = perf.memory.totalJSHeapSize / (1024 * 1024);
      return {
        usedMB: Math.round(usedMB * 100) / 100,
        totalMB: Math.round(totalMB * 100) / 100,
        percent: Math.round((usedMB / totalMB) * 100),
      };
    }

    return { usedMB: 0, totalMB: 0, percent: 0 };
  }

  startMonitoring(intervalMs = 5000): void {
    this.stopMonitoring();
    this.timer = setInterval(() => {
      const usage = this.getUsage();
      if (usage.usedMB > this.warningMB) {
        this.warningHandlers.forEach((h) => h(usage));
      }
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  onWarning(handler: (usage: MemoryUsage) => void): () => void {
    this.warningHandlers.push(handler);
    return () => {
      const idx = this.warningHandlers.indexOf(handler);
      if (idx !== -1) this.warningHandlers.splice(idx, 1);
    };
  }
}
