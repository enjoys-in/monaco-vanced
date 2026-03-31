// ── Patterns ───────────────────────────────────────────────
// Habit learning from repeated signal sequences.

import type { IntentSignal } from "./types";

export class PatternDetector {
  private signals: IntentSignal[] = [];
  private maxSignals = 200;

  record(signal: IntentSignal): void {
    this.signals.push(signal);
    if (this.signals.length > this.maxSignals) {
      this.signals = this.signals.slice(-this.maxSignals);
    }
  }

  /**
   * Returns the most frequent signal type in the given time window.
   */
  dominantType(windowMs = 30_000): IntentSignal["type"] | null {
    const cutoff = Date.now() - windowMs;
    const recent = this.signals.filter((s) => s.timestamp >= cutoff);
    if (recent.length === 0) return null;

    const counts = new Map<string, number>();
    for (const s of recent) {
      counts.set(s.type, (counts.get(s.type) ?? 0) + 1);
    }

    let max = 0;
    let dominant: string | null = null;
    for (const [type, count] of counts) {
      if (count > max) {
        max = count;
        dominant = type;
      }
    }
    return dominant as IntentSignal["type"] | null;
  }

  getRecent(count = 10): IntentSignal[] {
    return this.signals.slice(-count);
  }
}
