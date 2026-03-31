// ── Kafka Exporter (WebSocket REST Proxy) ──────────────────

import type { AuditEvent, AuditExporter } from "../types";

export interface KafkaExporterConfig {
  proxyUrl: string;
  topic: string;
  headers?: Record<string, string>;
}

export class KafkaExporter implements AuditExporter {
  readonly name = "kafka";
  private readonly config: KafkaExporterConfig;

  constructor(config: KafkaExporterConfig) {
    this.config = config;
  }

  async export(events: AuditEvent[]): Promise<void> {
    const records = events.map((event) => ({
      key: event.id,
      value: JSON.stringify(event),
    }));

    try {
      const resp = await fetch(`${this.config.proxyUrl}/topics/${this.config.topic}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/vnd.kafka.json.v2+json",
          ...this.config.headers,
        },
        body: JSON.stringify({ records }),
      });

      if (!resp.ok) {
        throw new Error(`Kafka proxy error ${resp.status}: ${resp.statusText}`);
      }
    } catch (err) {
      console.error("[Audit/Kafka] Export failed:", err);
    }
  }
}
