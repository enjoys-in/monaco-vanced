// ── Telemetry Module Types ─────────────────────────────────

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  attributes?: Record<string, unknown>;
  status?: "ok" | "error" | "unset";
}

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: number;
}

export interface TelemetryExporter {
  name: string;
  exportSpans?(spans: Span[]): Promise<void>;
  exportEvents?(events: AnalyticsEvent[]): Promise<void>;
}

export interface TelemetryConfig {
  serviceName?: string;
  exporters?: TelemetryExporter[];
  sampleRate?: number;
}

export interface TelemetryModuleAPI {
  startSpan(name: string, parent?: string): Span;
  endSpan(spanId: string): void;
  recordEvent(name: string, props?: Record<string, unknown>): void;
  addExporter(exporter: TelemetryExporter): void;
  flush(): Promise<void>;
  isEnabled(): boolean;
  setEnabled(v: boolean): void;
}
