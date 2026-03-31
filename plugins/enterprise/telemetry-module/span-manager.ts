// ── Span Manager ───────────────────────────────────────────

import type { Span } from "./types";

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateSpanId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class SpanManager {
  private readonly spans = new Map<string, Span>();
  private readonly traces = new Map<string, Set<string>>(); // traceId → spanIds

  startSpan(name: string, parentId?: string): Span {
    const parent = parentId ? this.spans.get(parentId) : undefined;
    const traceId = parent?.traceId ?? generateId();
    const spanId = generateSpanId();

    const span: Span = {
      traceId,
      spanId,
      parentSpanId: parentId,
      name,
      startTime: performance.now(),
      status: "unset",
    };

    this.spans.set(spanId, span);

    let traceSpans = this.traces.get(traceId);
    if (!traceSpans) {
      traceSpans = new Set();
      this.traces.set(traceId, traceSpans);
    }
    traceSpans.add(spanId);

    return span;
  }

  endSpan(spanId: string): Span | undefined {
    const span = this.spans.get(spanId);
    if (!span) return undefined;

    span.endTime = performance.now();
    if (span.status === "unset") {
      span.status = "ok";
    }
    return span;
  }

  getSpan(spanId: string): Span | undefined {
    return this.spans.get(spanId);
  }

  getActiveSpans(): Span[] {
    return [...this.spans.values()].filter((s) => s.endTime === undefined);
  }

  getTrace(traceId: string): Span[] {
    const spanIds = this.traces.get(traceId);
    if (!spanIds) return [];
    return [...spanIds]
      .map((id) => this.spans.get(id))
      .filter((s): s is Span => s !== undefined);
  }

  getCompletedSpans(): Span[] {
    return [...this.spans.values()].filter((s) => s.endTime !== undefined);
  }

  clear(): void {
    this.spans.clear();
    this.traces.clear();
  }
}
