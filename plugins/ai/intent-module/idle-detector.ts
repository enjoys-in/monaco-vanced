// ── Idle Detector ──────────────────────────────────────────
// Fires a callback after N ms of inactivity.

export class IdleDetector {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private timeout: number;
  private callback: () => void;

  constructor(timeout: number, callback: () => void) {
    this.timeout = timeout;
    this.callback = callback;
  }

  activity(): void {
    this.reset();
    this.timer = setTimeout(() => {
      this.callback();
    }, this.timeout);
  }

  reset(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  dispose(): void {
    this.reset();
  }
}
