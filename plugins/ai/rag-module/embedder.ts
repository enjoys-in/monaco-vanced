// ── Embedder ───────────────────────────────────────────────
// Generates embeddings via an external API.

import type { EmbeddingConfig } from "./types";

export class Embedder {
  private config: EmbeddingConfig;

  constructor(config: EmbeddingConfig) {
    this.config = config;
  }

  async embed(text: string): Promise<Float32Array> {
    return (await this.embedBatch([text]))[0]!;
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    const res = await fetch(this.config.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.config.headers,
      },
      body: JSON.stringify({
        input: texts,
        model: this.config.model ?? "text-embedding-3-small",
      }),
    });

    if (!res.ok) {
      throw new Error(`Embedding request failed: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as {
      data: Array<{ embedding: number[] }>;
    };

    return json.data.map((d) => new Float32Array(d.embedding));
  }

  dispose(): void {
    // No persistent resources
  }
}
