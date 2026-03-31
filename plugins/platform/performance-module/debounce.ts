// ── Performance Module — DebouncerRegistry ────────────────────

export class DebouncerRegistry {
  private readonly debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly throttleTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly throttleLast = new Map<string, number>();

  debounce(key: string, fn: () => void, ms: number): void {
    const existing = this.debounceTimers.get(key);
    if (existing) clearTimeout(existing);
    this.debounceTimers.set(key, setTimeout(() => {
      this.debounceTimers.delete(key);
      fn();
    }, ms));
  }

  throttle(key: string, fn: () => void, ms: number): void {
    const last = this.throttleLast.get(key) ?? 0;
    const now = Date.now();
    const remaining = ms - (now - last);

    if (remaining <= 0) {
      this.throttleLast.set(key, now);
      fn();
    } else if (!this.throttleTimers.has(key)) {
      this.throttleTimers.set(key, setTimeout(() => {
        this.throttleLast.set(key, Date.now());
        this.throttleTimers.delete(key);
        fn();
      }, remaining));
    }
  }

  cancel(key: string): void {
    const dt = this.debounceTimers.get(key);
    if (dt) { clearTimeout(dt); this.debounceTimers.delete(key); }
    const tt = this.throttleTimers.get(key);
    if (tt) { clearTimeout(tt); this.throttleTimers.delete(key); }
  }

  cancelAll(): void {
    for (const t of this.debounceTimers.values()) clearTimeout(t);
    for (const t of this.throttleTimers.values()) clearTimeout(t);
    this.debounceTimers.clear();
    this.throttleTimers.clear();
    this.throttleLast.clear();
  }
}
