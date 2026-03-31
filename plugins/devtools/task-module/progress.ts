// ── Task Module — Progress Tracker ───────────────────────────

export class ProgressTracker {
  private progress = new Map<string, number>();
  private handlers = new Map<string, Array<(percent: number) => void>>();

  update(taskId: string, percent: number): void {
    const clamped = Math.max(0, Math.min(100, percent));
    this.progress.set(taskId, clamped);

    const callbacks = this.handlers.get(taskId);
    if (callbacks) {
      for (const cb of callbacks) {
        cb(clamped);
      }
    }
  }

  get(taskId: string): number {
    return this.progress.get(taskId) ?? 0;
  }

  onProgress(taskId: string, handler: (percent: number) => void): () => void {
    const existing = this.handlers.get(taskId) ?? [];
    existing.push(handler);
    this.handlers.set(taskId, existing);

    return () => {
      const arr = this.handlers.get(taskId);
      if (arr) {
        const idx = arr.indexOf(handler);
        if (idx >= 0) arr.splice(idx, 1);
      }
    };
  }

  remove(taskId: string): void {
    this.progress.delete(taskId);
    this.handlers.delete(taskId);
  }

  clear(): void {
    this.progress.clear();
    this.handlers.clear();
  }
}
