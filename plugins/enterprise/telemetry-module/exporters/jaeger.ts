// ── Jaeger Exporter ────────────────────────────────────────

import type { Span, TelemetryExporter } from "../types";

export interface JaegerExporterConfig {
  url: string;
  serviceName?: string;
  headers?: Record<string, string>;
}

export class JaegerExporter implements TelemetryExporter {
  readonly name = "jaeger";
  private readonly config: JaegerExporterConfig;

  constructor(config: JaegerExporterConfig) {
    this.config = config;
  }

  async exportSpans(spans: Span[]): Promise<void> {
    if (spans.length === 0) return;

    const serviceName = this.config.serviceName ?? "monaco-vanced";

    // Thrift-over-HTTP JSON format
    const batch = {
      process: {
        serviceName,
        tags: [],
      },
      spans: spans.map((s) => ({
        traceIdLow: s.traceId.slice(16),
        traceIdHigh: s.traceId.slice(0, 16),
        spanId: s.spanId,
        parentSpanId: s.parentSpanId ?? "0",
        operationName: s.name,
        startTime: Math.round(s.startTime * 1000), // microseconds
        duration: s.endTime
          ? Math.round((s.endTime - s.startTime) * 1000)
          : 0,
        tags: [
          ...(s.status
            ? [{ key: "status", type: "string", value: s.status }]
            : []),
          ...Object.entries(s.attributes ?? {}).map(([k, v]) => ({
            key: k,
            type: "string",
            value: String(v),
          })),
        ],
        logs: [],
      })),
    };

    try {
      const resp = await fetch(`${this.config.url}/api/traces`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...this.config.headers },
        body: JSON.stringify([batch]),
      });
      if (!resp.ok) console.error(`[Jaeger] Export failed: ${resp.status}`);
    } catch (err) {
      console.error("[Jaeger] Export error:", err);
    }
  }
}
