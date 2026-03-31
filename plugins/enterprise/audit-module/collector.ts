// ── Audit Collector ────────────────────────────────────────

import type { AuditEvent, AuditExporter, AuditFilter, AuditStats } from "./types";

export class AuditCollector {
  private buffer: AuditEvent[] = [];
  private archive: AuditEvent[] = [];
  private readonly exporters: AuditExporter[] = [];
  private readonly bufferSize: number;
  private idCounter = 0;

  constructor(bufferSize = 100) {
    this.bufferSize = bufferSize;
  }

  log(event: Omit<AuditEvent, "id" | "timestamp">): AuditEvent {
    const full: AuditEvent = {
      ...event,
      id: `audit-${++this.idCounter}-${Date.now()}`,
      timestamp: Date.now(),
    };
    this.buffer.push(full);
    this.archive.push(full);

    if (this.buffer.length >= this.bufferSize) {
      void this.flush();
    }

    return full;
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0);
    await Promise.all(this.exporters.map((e) => e.export(batch).catch(console.error)));
  }

  query(filter: AuditFilter): AuditEvent[] {
    let results = [...this.archive];

    if (filter.actor) results = results.filter((e) => e.actor === filter.actor);
    if (filter.action) results = results.filter((e) => e.action === filter.action);
    if (filter.from) results = results.filter((e) => e.timestamp >= filter.from!);
    if (filter.to) results = results.filter((e) => e.timestamp <= filter.to!);
    if (filter.limit) results = results.slice(0, filter.limit);

    return results;
  }

  addExporter(exporter: AuditExporter): void {
    this.exporters.push(exporter);
  }

  getStats(): AuditStats {
    return {
      totalEvents: this.archive.length,
      bufferedEvents: this.buffer.length,
      exporterCount: this.exporters.length,
    };
  }
}
