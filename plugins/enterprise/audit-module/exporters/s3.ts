// ── S3 Exporter (Presigned URL Upload) ─────────────────────

import type { AuditEvent, AuditExporter } from "../types";

export interface S3ExporterConfig {
  presignedUrlEndpoint: string;
  prefix?: string;
  batchSize?: number;
  headers?: Record<string, string>;
}

export class S3Exporter implements AuditExporter {
  readonly name = "s3";
  private readonly config: Required<Omit<S3ExporterConfig, "headers">> & { headers: Record<string, string> };

  constructor(config: S3ExporterConfig) {
    this.config = {
      presignedUrlEndpoint: config.presignedUrlEndpoint,
      prefix: config.prefix ?? "audit",
      batchSize: config.batchSize ?? 100,
      headers: config.headers ?? {},
    };
  }

  async export(events: AuditEvent[]): Promise<void> {
    for (let i = 0; i < events.length; i += this.config.batchSize) {
      const batch = events.slice(i, i + this.config.batchSize);
      await this.uploadBatch(batch);
    }
  }

  private async uploadBatch(batch: AuditEvent[]): Promise<void> {
    try {
      // Request a presigned URL
      const key = `${this.config.prefix}/${new Date().toISOString().slice(0, 10)}/${Date.now()}.jsonl`;
      const urlResp = await fetch(this.config.presignedUrlEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...this.config.headers },
        body: JSON.stringify({ key }),
      });

      if (!urlResp.ok) throw new Error(`Presign failed: ${urlResp.status}`);
      const { url } = (await urlResp.json()) as { url: string };

      // Upload JSON Lines
      const body = batch.map((e) => JSON.stringify(e)).join("\n");
      const putResp = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/x-ndjson" },
        body,
      });

      if (!putResp.ok) throw new Error(`S3 upload failed: ${putResp.status}`);
    } catch (err) {
      console.error("[Audit/S3] Export failed:", err);
    }
  }
}
