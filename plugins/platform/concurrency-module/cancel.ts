// ── Concurrency Module — CancelPrevious ───────────────────────

export class CancelPrevious {
  private readonly controllers = new Map<string, AbortController>();

  async cancelPrevious<T>(
    key: string,
    fn: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    // Abort previous
    const prev = this.controllers.get(key);
    if (prev) prev.abort();

    const controller = new AbortController();
    this.controllers.set(key, controller);

    try {
      const result = await fn(controller.signal);
      return result;
    } finally {
      // Only delete if this is still the current controller
      if (this.controllers.get(key) === controller) {
        this.controllers.delete(key);
      }
    }
  }

  abort(key: string): void {
    const ctrl = this.controllers.get(key);
    if (ctrl) {
      ctrl.abort();
      this.controllers.delete(key);
    }
  }

  abortAll(): void {
    for (const ctrl of this.controllers.values()) ctrl.abort();
    this.controllers.clear();
  }
}
