// ── Audit Module Types ─────────────────────────────────────

export interface AuditEvent {
  id: string;
  timestamp: number;
  actor: string;
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
}

export interface AuditFilter {
  actor?: string;
  action?: string;
  from?: number;
  to?: number;
  limit?: number;
}

export interface AuditExporter {
  name: string;
  export(events: AuditEvent[]): Promise<void>;
}

export interface RedactConfig {
  fields: string[];
  replacement?: string;
}

export interface AuditConfig {
  exporters?: AuditExporter[];
  redactFields?: string[];
  bufferSize?: number;
}

export interface AuditStats {
  totalEvents: number;
  bufferedEvents: number;
  exporterCount: number;
}

export interface AuditModuleAPI {
  log(event: Omit<AuditEvent, "id" | "timestamp">): void;
  query(filter: AuditFilter): AuditEvent[];
  addExporter(exporter: AuditExporter): void;
  flush(): Promise<void>;
  getStats(): AuditStats;
}
