// ── Vector Store ───────────────────────────────────────────
// In-memory vector store with cosine similarity search.

import type { Chunk, RetrievalResult } from "./types";

export class VectorStore {
  private chunks = new Map<string, Chunk>();
  private fileIndex = new Map<string, Set<string>>();

  add(chunk: Chunk): void {
    this.chunks.set(chunk.id, chunk);
    if (!this.fileIndex.has(chunk.filePath)) {
      this.fileIndex.set(chunk.filePath, new Set());
    }
    this.fileIndex.get(chunk.filePath)!.add(chunk.id);
  }

  addBatch(chunks: Chunk[]): void {
    for (const chunk of chunks) {
      this.add(chunk);
    }
  }

  removeFile(filePath: string): void {
    const ids = this.fileIndex.get(filePath);
    if (!ids) return;
    for (const id of ids) {
      this.chunks.delete(id);
    }
    this.fileIndex.delete(filePath);
  }

  search(queryEmbedding: Float32Array, topK: number, minScore = 0): RetrievalResult[] {
    const results: RetrievalResult[] = [];

    for (const chunk of this.chunks.values()) {
      if (!chunk.embedding) continue;
      const score = cosineSimilarity(queryEmbedding, chunk.embedding);
      if (score >= minScore) {
        results.push({ chunk, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  getAll(): Chunk[] {
    return Array.from(this.chunks.values());
  }

  getByFile(filePath: string): Chunk[] {
    const ids = this.fileIndex.get(filePath);
    if (!ids) return [];
    return Array.from(ids).map((id) => this.chunks.get(id)!).filter(Boolean);
  }

  getStats(): { fileCount: number; chunkCount: number } {
    return {
      fileCount: this.fileIndex.size,
      chunkCount: this.chunks.size,
    };
  }

  clear(): void {
    this.chunks.clear();
    this.fileIndex.clear();
  }

  dispose(): void {
    this.clear();
  }
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
