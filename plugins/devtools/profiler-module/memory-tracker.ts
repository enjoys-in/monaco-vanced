// ── Profiler Module — Memory Tracker ─────────────────────────
// Captures JS heap memory snapshots using performance.memory.

import type { MemorySnapshot } from "./types";

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export class MemoryTracker {
  private history: MemorySnapshot[] = [];
  private maxHistory: number;

  constructor(maxHistory = 1000) {
    this.maxHistory = maxHistory;
  }

  snapshot(): MemorySnapshot {
    const mem = (performance as unknown as { memory?: PerformanceMemory }).memory;

    const snap: MemorySnapshot = {
      timestamp: Date.now(),
      usedJSHeapSize: mem?.usedJSHeapSize ?? 0,
      totalJSHeapSize: mem?.totalJSHeapSize ?? 0,
    };

    this.history.push(snap);

    // Trim history to max size
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    return snap;
  }

  getHistory(): MemorySnapshot[] {
    return [...this.history];
  }

  clear(): void {
    this.history = [];
  }

  get size(): number {
    return this.history.length;
  }
}
