// ── Performance Module — PerfMarks ────────────────────────────

import type { PerfMark } from "./types";

export class PerfMarks {
  private readonly marks = new Map<string, number>();

  mark(name: string): void {
    performance.mark(name);
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string, endMark?: string): PerfMark | null {
    try {
      if (endMark) {
        performance.measure(name, startMark, endMark);
      } else {
        performance.measure(name, startMark);
      }

      const entries = performance.getEntriesByName(name, "measure");
      const last = entries[entries.length - 1];
      if (!last) return null;

      return {
        name: last.name,
        startTime: last.startTime,
        duration: last.duration,
      };
    } catch {
      return null;
    }
  }

  getEntries(): PerfMark[] {
    return performance.getEntriesByType("mark").map((e) => ({
      name: e.name,
      startTime: e.startTime,
      duration: undefined,
    }));
  }

  clear(): void {
    this.marks.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }
}
