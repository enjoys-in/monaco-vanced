// ── Metering Engine ────────────────────────────────────────

import type { MeterEvent } from "./types";

const STORAGE_KEY = "monaco-vanced:billing:meters";

export class MeteringEngine {
  private counters = new Map<string, number>();
  private events: MeterEvent[] = [];

  constructor() {
    this.loadFromStorage();
  }

  record(feature: string, qty = 1, tenantId?: string): void {
    const current = this.counters.get(feature) ?? 0;
    this.counters.set(feature, current + qty);

    this.events.push({
      feature,
      quantity: qty,
      timestamp: Date.now(),
      tenantId,
    });

    this.saveToStorage();
  }

  getUsage(feature: string): number {
    return this.counters.get(feature) ?? 0;
  }

  reset(feature: string): void {
    this.counters.delete(feature);
    this.saveToStorage();
  }

  getEvents(): MeterEvent[] {
    return [...this.events];
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as Record<string, number>;
        for (const [k, v] of Object.entries(data)) {
          this.counters.set(k, v);
        }
      }
    } catch {
      // Storage unavailable
    }
  }

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.counters);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage unavailable
    }
  }
}
