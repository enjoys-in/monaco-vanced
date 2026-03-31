// ── Console Exporter ───────────────────────────────────────

import type { AuditEvent, AuditExporter } from "../types";

export class ConsoleExporter implements AuditExporter {
  readonly name = "console";

  async export(events: AuditEvent[]): Promise<void> {
    if (events.length === 0) return;
    console.group(`[Audit] ${events.length} event(s)`);
    console.table(
      events.map((e) => ({
        id: e.id,
        actor: e.actor,
        action: e.action,
        resource: e.resource,
        timestamp: new Date(e.timestamp).toISOString(),
      })),
    );
    console.groupEnd();
  }
}
