// ── Concurrency Module — AbortPool ────────────────────────────

export class AbortPool {
  private readonly controllers = new Map<string, AbortController>();

  getSignal(key: string): AbortSignal {
    let ctrl = this.controllers.get(key);
    if (!ctrl || ctrl.signal.aborted) {
      ctrl = new AbortController();
      this.controllers.set(key, ctrl);
    }
    return ctrl.signal;
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

  has(key: string): boolean {
    return this.controllers.has(key);
  }

  isAborted(key: string): boolean {
    const ctrl = this.controllers.get(key);
    return ctrl?.signal.aborted ?? false;
  }
}
