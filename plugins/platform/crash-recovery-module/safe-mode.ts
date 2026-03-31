// ── Crash Recovery Module — SafeModeManager ───────────────────

export class SafeModeManager {
  private safeMode = false;
  private readonly maxCrashes: number;
  private readonly windowMs: number;
  private readonly storageKey: string;

  constructor(maxCrashes = 3, windowMs = 60_000, storageKey = "monaco-crash-log") {
    this.maxCrashes = maxCrashes;
    this.windowMs = windowMs;
    this.storageKey = storageKey;
    this.checkOnStartup();
  }

  private getCrashTimestamps(): number[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      return JSON.parse(raw) as number[];
    } catch {
      return [];
    }
  }

  private saveCrashTimestamps(timestamps: number[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(timestamps));
    } catch {}
  }

  private checkOnStartup(): void {
    const now = Date.now();
    const timestamps = this.getCrashTimestamps().filter((t) => now - t < this.windowMs);
    this.saveCrashTimestamps(timestamps);

    if (timestamps.length >= this.maxCrashes) {
      this.safeMode = true;
    }
  }

  recordCrash(): void {
    const now = Date.now();
    const timestamps = this.getCrashTimestamps().filter((t) => now - t < this.windowMs);
    timestamps.push(now);
    this.saveCrashTimestamps(timestamps);

    if (timestamps.length >= this.maxCrashes) {
      this.safeMode = true;
    }
  }

  isSafeMode(): boolean {
    return this.safeMode;
  }

  enableSafeMode(): void {
    this.safeMode = true;
  }

  reset(): void {
    this.safeMode = false;
    try {
      localStorage.removeItem(this.storageKey);
    } catch {}
  }
}
