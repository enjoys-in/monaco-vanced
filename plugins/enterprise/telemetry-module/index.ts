// ── Telemetry Module ───────────────────────────────────────

import type { MonacoPlugin, PluginContext } from "@core/types";
import type {
  AnalyticsEvent,
  Span,
  TelemetryConfig,
  TelemetryExporter,
  TelemetryModuleAPI,
} from "./types";
import { SpanManager } from "./span-manager";
import { AnalyticsCollector } from "./analytics";
import { TelemetryEvents } from "@core/events";

export type { AnalyticsEvent, Span, TelemetryConfig, TelemetryExporter, TelemetryModuleAPI };
export { SpanManager, AnalyticsCollector };
export { ConsoleExporter } from "./exporters/console";
export { OTLPExporter } from "./exporters/otlp";
export { JaegerExporter } from "./exporters/jaeger";
export { DatadogExporter } from "./exporters/datadog";

export function createTelemetryPlugin(
  config: TelemetryConfig = {},
): { plugin: MonacoPlugin; api: TelemetryModuleAPI } {
  const spans = new SpanManager();
  const analytics = new AnalyticsCollector(50, 30000);
  const exporters: TelemetryExporter[] = config.exporters ? [...config.exporters] : [];
  const sampleRate = config.sampleRate ?? 1.0;
  let enabled = true;
  let ctx: PluginContext | null = null;

  const shouldSample = (): boolean => enabled && Math.random() < sampleRate;

  const api: TelemetryModuleAPI = {
    startSpan(name: string, parent?: string): Span {
      const span = spans.startSpan(name, parent);
      if (shouldSample()) {
        ctx?.emit(TelemetryEvents.SpanStart, { spanId: span.spanId, name });
      }
      return span;
    },

    endSpan(spanId: string): void {
      const span = spans.endSpan(spanId);
      if (span && shouldSample()) {
        ctx?.emit(TelemetryEvents.SpanEnd, {
          spanId: span.spanId,
          name: span.name,
          duration: span.endTime! - span.startTime,
        });
      }
    },

    recordEvent(name: string, props?: Record<string, unknown>): void {
      if (!shouldSample()) return;
      analytics.record(name, props);
      ctx?.emit(TelemetryEvents.Event, { name, properties: props });
    },

    addExporter(exporter: TelemetryExporter): void {
      exporters.push(exporter);
    },

    async flush(): Promise<void> {
      const completedSpans = spans.getCompletedSpans();
      const events = await analytics.flush();

      await Promise.all(
        exporters.map(async (exp) => {
          try {
            if (exp.exportSpans && completedSpans.length > 0) {
              await exp.exportSpans(completedSpans);
            }
            if (exp.exportEvents && events.length > 0) {
              await exp.exportEvents(events);
            }
          } catch (err) {
            console.error(`[Telemetry] Exporter "${exp.name}" failed:`, err);
          }
        }),
      );

      spans.clear();
    },

    isEnabled(): boolean {
      return enabled;
    },

    setEnabled(v: boolean): void {
      enabled = v;
    },
  };

  const plugin: MonacoPlugin = {
    id: "telemetry-module",
    name: "Telemetry Module",
    version: "1.0.0",
    description: "Distributed tracing and analytics with OTLP, Jaeger, and Datadog exporters",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;
    },

    onDispose(): void {
      void api.flush();
      analytics.dispose();
      ctx = null;
    },
  };

  return { plugin, api };
}
