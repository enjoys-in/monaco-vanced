// ── Streaming Module — ManagedStream ──────────────────────────

import type { StreamConfig, StreamStatus } from "./types";

export class ManagedStream {
  readonly id: string;
  private _status: StreamStatus = "active";
  private readonly config: StreamConfig;
  private readonly buffer: unknown[] = [];
  private readonly bufferSize: number;
  private flushing = false;

  constructor(id: string, config: StreamConfig) {
    this.id = id;
    this.config = config;
    this.bufferSize = config.bufferSize ?? 64;
  }

  get status(): StreamStatus {
    return this._status;
  }

  push(chunk: unknown): void {
    if (this._status !== "active") return;

    this.buffer.push(chunk);

    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    } else if (!this.flushing) {
      this.scheduleFlush();
    }
  }

  complete(): void {
    if (this._status !== "active") return;
    this.flush();
    this._status = "completed";
    try { this.config.onDone(); } catch {}
  }

  abort(): void {
    if (this._status !== "active") return;
    this._status = "aborted";
    this.buffer.length = 0;
  }

  error(err: unknown): void {
    if (this._status !== "active") return;
    this._status = "error";
    this.buffer.length = 0;
    try { this.config.onError(err); } catch {}
  }

  private flush(): void {
    while (this.buffer.length > 0) {
      const chunk = this.buffer.shift();
      try {
        this.config.onChunk(chunk);
      } catch (err) {
        this.error(err);
        return;
      }
    }
    this.flushing = false;
  }

  private scheduleFlush(): void {
    this.flushing = true;
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(() => this.flush());
    } else {
      setTimeout(() => this.flush(), 0);
    }
  }
}
