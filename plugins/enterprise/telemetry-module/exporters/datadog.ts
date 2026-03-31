// ── Datadog Exporter ───────────────────────────────────────

import type { AnalyticsEvent, Span, TelemetryExporter } from "../types";

export interface DatadogExporterConfig {
  apiKey: string;
  site?: string;
  service?: string;
  env?: string;
}

export class DatadogExporter implements TelemetryExporter {
  readonly name = "datadog";
  private readonly config: Required<DatadogExporterConfig>;

  constructor(config: DatadogExporterConfig) {
    this.config = {
      apiKey: config.apiKey,
      site: config.site ?? "datadoghq.com",
      service: config.service ?? "monaco-vanced",
      env: config.env ?? "production",
    };
  }

  async exportSpans(spans: Span[]): Promise<void> {
    if (spans.length === 0) return;

    // DD trace format
    const traces = this.groupByTrace(spans).map((traceSpans) =>
      traceSpans.map((s) => ({
        trace_id: this.hexToNumericId(s.traceId),
        span_id: this.hexToNumericId(s.spanId),
        parent_id: s.parentSpanId ? this.hexToNumericId(s.parentSpanId) : 0,
        name: s.name,
        service: this.config.service,
        resource: s.name,
        type: "custom",
        start: Math.round(s.startTime * 1_000_000), // nanoseconds
        duration: s.endTime
          ? Math.round((s.endTime - s.startTime) * 1_000_000)
          : 0,
        error: s.status === "error" ? 1 : 0,
        meta: {
          env: this.config.env,
          ...Object.fromEntries(
            Object.entries(s.attributes ?? {}).map(([k, v]) => [k, String(v)]),
          ),
        },
      })),
    );

    try {
      const resp = await fetch(`https://trace.agent.${this.config.site}/api/v0.2/traces`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "DD-API-KEY": this.config.apiKey,
        },
        body: JSON.stringify(traces),
      });
      if (!resp.ok) console.error(`[Datadog] Export failed: ${resp.status}`);
    } catch (err) {
      console.error("[Datadog] Export error:", err);
    }
  }

  async exportEvents(events: AnalyticsEvent[]): Promise<void> {
    if (events.length === 0) return;

    const ddEvents = events.map((e) => ({
      title: e.name,
      text: JSON.stringify(e.properties ?? {}),
      date_happened: Math.floor(e.timestamp / 1000),
      tags: [`service:${this.config.service}`, `env:${this.config.env}`],
    }));

    try {
      const resp = await fetch(`https://api.${this.config.site}/api/v1/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "DD-API-KEY": this.config.apiKey,
        },
        body: JSON.stringify({ series: ddEvents }),
      });
      if (!resp.ok) console.error(`[Datadog] Event export failed: ${resp.status}`);
    } catch (err) {
      console.error("[Datadog] Event export error:", err);
    }
  }

  private groupByTrace(spans: Span[]): Span[][] {
    const groups = new Map<string, Span[]>();
    for (const span of spans) {
      let group = groups.get(span.traceId);
      if (!group) {
        group = [];
        groups.set(span.traceId, group);
      }
      group.push(span);
    }
    return [...groups.values()];
  }

  private hexToNumericId(hex: string): number {
    // Take last 8 hex chars to fit in a number safely
    return parseInt(hex.slice(-8), 16);
  }
}
