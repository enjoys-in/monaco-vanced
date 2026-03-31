// ── Concurrency Module — AsyncMutex ───────────────────────────

export class AsyncMutex {
  private locked = false;
  private readonly queue: Array<() => void> = [];

  lock(): Promise<() => void> {
    return new Promise<() => void>((resolve) => {
      const acquire = () => {
        this.locked = true;
        let released = false;
        resolve(() => {
          if (released) return;
          released = true;
          this.locked = false;
          if (this.queue.length > 0) {
            const next = this.queue.shift()!;
            next();
          }
        });
      };

      if (!this.locked) {
        acquire();
      } else {
        this.queue.push(acquire);
      }
    });
  }

  get isLocked(): boolean {
    return this.locked;
  }

  get waiting(): number {
    return this.queue.length;
  }
}
