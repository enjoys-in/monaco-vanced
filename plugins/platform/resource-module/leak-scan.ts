// ── Resource Module — LeakScanner ─────────────────────────────

import type { LeakReport } from "./types";
import { ResourceRegistry } from "./registry";

export class LeakScanner {
  private readonly registry: ResourceRegistry;
  private readonly graceMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly leakHandlers: Array<(reports: LeakReport[]) => void> = [];

  constructor(registry: ResourceRegistry, graceMs = 30_000) {
    this.registry = registry;
    this.graceMs = graceMs;
  }

  scan(): LeakReport[] {
    const now = Date.now();
    const leaks: LeakReport[] = [];

    for (const entry of this.registry.getAll()) {
      const age = now - entry.createdAt;
      if (age > this.graceMs && entry.refCount <= 0) {
        leaks.push({
          type: entry.type,
          key: entry.key,
          ageSec: Math.round(age / 1000),
          owner: entry.owner,
        });
      }
    }

    return leaks;
  }

  startScanning(intervalMs: number): void {
    this.stopScanning();
    this.timer = setInterval(() => {
      const leaks = this.scan();
      if (leaks.length > 0) {
        this.leakHandlers.forEach((h) => {
          try { h(leaks); } catch {}
        });
      }
    }, intervalMs);
  }

  stopScanning(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  onLeak(handler: (reports: LeakReport[]) => void): () => void {
    this.leakHandlers.push(handler);
    return () => {
      const idx = this.leakHandlers.indexOf(handler);
      if (idx !== -1) this.leakHandlers.splice(idx, 1);
    };
  }
}
