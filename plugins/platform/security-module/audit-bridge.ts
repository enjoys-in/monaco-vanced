// ── Security Module — AuditBridge ─────────────────────────────

import type { AuditEvent } from "./types";

export class AuditBridge {
  private readonly logs: AuditEvent[] = [];
  private readonly maxLogs: number;

  constructor(maxLogs = 1000) {
    this.maxLogs = maxLogs;
  }

  log(event: AuditEvent): void {
    this.logs.push(event);
    if (this.logs.length > this.maxLogs) {
      this.logs.splice(0, this.logs.length - this.maxLogs);
    }
  }

  getAll(): readonly AuditEvent[] {
    return this.logs;
  }

  query(type: string): AuditEvent[] {
    return this.logs.filter((e) => e.type === type);
  }

  clear(): void {
    this.logs.length = 0;
  }
}
