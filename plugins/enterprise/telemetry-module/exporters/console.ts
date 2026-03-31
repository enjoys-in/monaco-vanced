// ── Console Exporter ───────────────────────────────────────

import type { AnalyticsEvent, Span, TelemetryExporter } from "../types";

export class ConsoleExporter implements TelemetryExporter {
  readonly name = "console";

  async exportSpans(spans: Span[]): Promise<void> {
    if (spans.length === 0) return;
    console.group(`[Telemetry] ${spans.length} span(s)`);
    for (const span of spans) {
      const duration = span.endTime != null ? `${(span.endTime - span.startTime).toFixed(2)}ms` : "active";
      console.log(
        `  [${span.status ?? "unset"}] ${span.name} (${duration}) trace=${span.traceId.slice(0, 8)} span=${span.spanId}`,
      );
    }
    console.groupEnd();
  }

  async exportEvents(events: AnalyticsEvent[]): Promise<void> {
    if (events.length === 0) return;
    console.group(`[Analytics] ${events.length} event(s)`);
    console.table(
      events.map((e) => ({
        name: e.name,
        timestamp: new Date(e.timestamp).toISOString(),
        properties: JSON.stringify(e.properties ?? {}),
      })),
    );
    console.groupEnd();
  }
}
