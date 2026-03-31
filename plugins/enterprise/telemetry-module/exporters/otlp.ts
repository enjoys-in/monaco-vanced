// ── OTLP Exporter (OpenTelemetry Protocol) ─────────────────

import type { AnalyticsEvent, Span, TelemetryExporter } from "../types";

export interface OTLPExporterConfig {
  url: string;
  headers?: Record<string, string>;
}

export class OTLPExporter implements TelemetryExporter {
  readonly name = "otlp";
  private readonly config: OTLPExporterConfig;

  constructor(config: OTLPExporterConfig) {
    this.config = config;
  }

  async exportSpans(spans: Span[]): Promise<void> {
    if (spans.length === 0) return;

    const resourceSpans = [
      {
        resource: { attributes: [] },
        scopeSpans: [
          {
            scope: { name: "monaco-vanced" },
            spans: spans.map((s) => ({
              traceId: s.traceId,
              spanId: s.spanId,
              parentSpanId: s.parentSpanId ?? "",
              name: s.name,
              startTimeUnixNano: Math.round(s.startTime * 1_000_000).toString(),
              endTimeUnixNano: s.endTime
                ? Math.round(s.endTime * 1_000_000).toString()
                : undefined,
              status: {
                code: s.status === "ok" ? 1 : s.status === "error" ? 2 : 0,
              },
              attributes: s.attributes
                ? Object.entries(s.attributes).map(([k, v]) => ({
                    key: k,
                    value: { stringValue: String(v) },
                  }))
                : [],
            })),
          },
        ],
      },
    ];

    try {
      const resp = await fetch(`${this.config.url}/v1/traces`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...this.config.headers },
        body: JSON.stringify({ resourceSpans }),
      });
      if (!resp.ok) console.error(`[OTLP] Export failed: ${resp.status}`);
    } catch (err) {
      console.error("[OTLP] Export error:", err);
    }
  }

  async exportEvents(events: AnalyticsEvent[]): Promise<void> {
    if (events.length === 0) return;

    const resourceLogs = [
      {
        resource: { attributes: [] },
        scopeLogs: [
          {
            scope: { name: "monaco-vanced" },
            logRecords: events.map((e) => ({
              timeUnixNano: (e.timestamp * 1_000_000).toString(),
              body: { stringValue: e.name },
              attributes: e.properties
                ? Object.entries(e.properties).map(([k, v]) => ({
                    key: k,
                    value: { stringValue: String(v) },
                  }))
                : [],
            })),
          },
        ],
      },
    ];

    try {
      const resp = await fetch(`${this.config.url}/v1/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...this.config.headers },
        body: JSON.stringify({ resourceLogs }),
      });
      if (!resp.ok) console.error(`[OTLP] Log export failed: ${resp.status}`);
    } catch (err) {
      console.error("[OTLP] Log export error:", err);
    }
  }
}
