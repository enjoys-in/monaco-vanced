// ── Streaming Module — BackpressureManager ────────────────────

export class BackpressureManager {
  private readonly buffers = new Map<string, unknown[]>();
  private readonly maxSize: number;
  private readonly flushCallbacks = new Map<string, (chunks: unknown[]) => void>();
  private rafIds = new Map<string, number>();

  constructor(maxSize = 128) {
    this.maxSize = maxSize;
  }

  register(id: string, onFlush: (chunks: unknown[]) => void): void {
    this.buffers.set(id, []);
    this.flushCallbacks.set(id, onFlush);
  }

  push(id: string, chunk: unknown): boolean {
    const buffer = this.buffers.get(id);
    if (!buffer) return false;

    buffer.push(chunk);

    if (buffer.length >= this.maxSize) {
      this.flush(id);
      return false; // Signal backpressure
    }

    this.scheduleFlush(id);
    return true;
  }

  flush(id: string): void {
    const buffer = this.buffers.get(id);
    const callback = this.flushCallbacks.get(id);
    if (!buffer || !callback || buffer.length === 0) return;

    const chunks = buffer.splice(0, buffer.length);
    try { callback(chunks); } catch {}

    const rafId = this.rafIds.get(id);
    if (rafId !== undefined && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(rafId);
      this.rafIds.delete(id);
    }
  }

  private scheduleFlush(id: string): void {
    if (this.rafIds.has(id)) return;

    if (typeof requestAnimationFrame !== "undefined") {
      const rafId = requestAnimationFrame(() => {
        this.rafIds.delete(id);
        this.flush(id);
      });
      this.rafIds.set(id, rafId);
    } else {
      setTimeout(() => this.flush(id), 16);
    }
  }

  remove(id: string): void {
    this.flush(id);
    this.buffers.delete(id);
    this.flushCallbacks.delete(id);
    const rafId = this.rafIds.get(id);
    if (rafId !== undefined && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(rafId);
    }
    this.rafIds.delete(id);
  }

  clear(): void {
    for (const id of this.buffers.keys()) this.remove(id);
  }
}
