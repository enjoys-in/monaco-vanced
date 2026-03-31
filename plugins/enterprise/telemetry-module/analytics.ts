// ── Analytics Collector ─────────────────────────────────────

import type { AnalyticsEvent } from "./types";

export interface AnalyticsFilter {
  name?: string;
  from?: number;
  to?: number;
  limit?: number;
}

export class AnalyticsCollector {
  private buffer: AnalyticsEvent[] = [];
  private archive: AnalyticsEvent[] = [];
  private readonly bufferSize: number;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(bufferSize = 50, autoFlushMs?: number) {
    this.bufferSize = bufferSize;
    if (autoFlushMs) {
      this.flushTimer = setInterval(() => {
        if (this.buffer.length > 0) {
          void this.flush();
        }
      }, autoFlushMs);
    }
  }

  record(name: string, properties?: Record<string, unknown>): AnalyticsEvent {
    const event: AnalyticsEvent = {
      name,
      properties,
      timestamp: Date.now(),
    };
    this.buffer.push(event);
    this.archive.push(event);

    if (this.buffer.length >= this.bufferSize) {
      void this.flush();
    }

    return event;
  }

  getEvents(filter?: AnalyticsFilter): AnalyticsEvent[] {
    let results = [...this.archive];

    if (filter?.name) results = results.filter((e) => e.name === filter.name);
    if (filter?.from) results = results.filter((e) => e.timestamp >= filter.from!);
    if (filter?.to) results = results.filter((e) => e.timestamp <= filter.to!);
    if (filter?.limit) results = results.slice(0, filter.limit);

    return results;
  }

  async flush(): Promise<AnalyticsEvent[]> {
    const batch = this.buffer.splice(0);
    return batch;
  }

  getBufferSize(): number {
    return this.buffer.length;
  }

  dispose(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
