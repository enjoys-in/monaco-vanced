// ── Concurrency Module — Semaphore ────────────────────────────

export class Semaphore {
  private current = 0;
  private readonly max: number;
  private readonly waiters: Array<() => void> = [];

  constructor(max: number) {
    this.max = max;
  }

  acquire(): Promise<void> {
    if (this.current < this.max) {
      this.current++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  release(): void {
    if (this.waiters.length > 0) {
      const next = this.waiters.shift()!;
      next();
    } else {
      this.current = Math.max(0, this.current - 1);
    }
  }

  get available(): number {
    return this.max - this.current;
  }

  get pending(): number {
    return this.waiters.length;
  }
}
