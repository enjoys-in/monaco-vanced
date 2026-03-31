// ── Retriever ──────────────────────────────────────────────
// High-level retrieval: query → embed → vector search.

import type { RetrievalResult } from "./types";
import { Embedder } from "./embedder";
import { VectorStore } from "./vector-store";

export class Retriever {
  constructor(
    private embedder: Embedder,
    private store: VectorStore,
    private defaultTopK: number,
    private minScore: number,
  ) {}

  async query(text: string, topK?: number): Promise<RetrievalResult[]> {
    const embedding = await this.embedder.embed(text);
    return this.store.search(embedding, topK ?? this.defaultTopK, this.minScore);
  }

  dispose(): void {
    // Retriever doesn't own embedder or store
  }
}
