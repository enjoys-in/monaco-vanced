// ── Audit Redactor ─────────────────────────────────────────

import type { AuditEvent, RedactConfig } from "./types";

export class Redactor {
  private readonly fields: Set<string>;
  private readonly replacement: string;

  constructor(config: RedactConfig) {
    this.fields = new Set(config.fields);
    this.replacement = config.replacement ?? "[REDACTED]";
  }

  redact(event: AuditEvent): AuditEvent {
    if (!event.metadata) return event;
    return {
      ...event,
      metadata: this.redactObject(event.metadata),
    };
  }

  private redactObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.fields.has(key)) {
        result[key] = this.replacement;
      } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        result[key] = this.redactObject(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
