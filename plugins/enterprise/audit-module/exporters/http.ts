// ── HTTP Exporter ──────────────────────────────────────────

import type { AuditEvent, AuditExporter } from "../types";

export interface HttpExporterConfig {
  url: string;
  headers?: Record<string, string>;
  batchSize?: number;
  retries?: number;
  retryDelayMs?: number;
}

export class HttpExporter implements AuditExporter {
  readonly name = "http";
  private readonly config: Required<HttpExporterConfig>;

  constructor(config: HttpExporterConfig) {
    this.config = {
      url: config.url,
      headers: config.headers ?? {},
      batchSize: config.batchSize ?? 50,
      retries: config.retries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000,
    };
  }

  async export(events: AuditEvent[]): Promise<void> {
    for (let i = 0; i < events.length; i += this.config.batchSize) {
      const batch = events.slice(i, i + this.config.batchSize);
      await this.sendWithRetry(batch);
    }
  }

  private async sendWithRetry(batch: AuditEvent[]): Promise<void> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const resp = await fetch(this.config.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...this.config.headers },
          body: JSON.stringify({ events: batch }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        return;
      } catch (err) {
        lastError = err;
        if (attempt < this.config.retries) {
          await new Promise((r) => setTimeout(r, this.config.retryDelayMs * (attempt + 1)));
        }
      }
    }

    console.error("[Audit/HTTP] Failed after retries:", lastError);
  }
}
