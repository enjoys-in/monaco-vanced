// ── Typing Analyzer ────────────────────────────────────────
// Measures words-per-minute to detect fast/slow typing.

export class TypingAnalyzer {
  private timestamps: number[] = [];
  private windowMs: number;
  private fastWpm: number;
  private slowWpm: number;

  constructor(windowMs = 5000, fastWpm = 80, slowWpm = 20) {
    this.windowMs = windowMs;
    this.fastWpm = fastWpm;
    this.slowWpm = slowWpm;
  }

  recordKeystroke(): "fast" | "slow" | "normal" {
    const now = Date.now();
    this.timestamps.push(now);
    this.pruneOld(now);

    const wpm = this.computeWpm(now);

    if (wpm >= this.fastWpm) return "fast";
    if (wpm <= this.slowWpm && this.timestamps.length > 3) return "slow";
    return "normal";
  }

  private computeWpm(now: number): number {
    if (this.timestamps.length < 2) return 0;
    const oldest = this.timestamps[0];
    const durationMs = now - oldest;
    if (durationMs <= 0) return 0;
    // Assume ~5 characters per word
    const chars = this.timestamps.length;
    const words = chars / 5;
    const minutes = durationMs / 60_000;
    return words / minutes;
  }

  private pruneOld(now: number): void {
    const cutoff = now - this.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0] < cutoff) {
      this.timestamps.shift();
    }
  }
}
