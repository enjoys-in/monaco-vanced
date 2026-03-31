// ── RAG Module Types ───────────────────────────────────────

export interface Chunk {
  readonly id: string;
  readonly filePath: string;
  readonly content: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly language: string;
  readonly embedding?: Float32Array;
}

export interface RetrievalResult {
  readonly chunk: Chunk;
  readonly score: number;
}

export interface EmbeddingConfig {
  /** Embedding API endpoint */
  readonly baseUrl: string;
  /** Auth headers */
  readonly headers?: Record<string, string>;
  /** Embedding model name */
  readonly model?: string;
  /** Dimension of embedding vectors */
  readonly dimensions?: number;
}

export interface RAGConfig {
  readonly embedding: EmbeddingConfig;
  /** Chunk size in lines (default: 30) */
  readonly chunkSize?: number;
  /** Chunk overlap in lines (default: 5) */
  readonly chunkOverlap?: number;
  /** Top-K results for retrieval (default: 5) */
  readonly topK?: number;
  /** Minimum score threshold (default: 0.3) */
  readonly minScore?: number;
  /** Max files to index (default: 500) */
  readonly maxFiles?: number;
}

export interface RAGModuleAPI {
  index(filePath: string, content: string, language: string): Promise<void>;
  indexBulk(files: Array<{ path: string; content: string; language: string }>): Promise<void>;
  query(text: string, topK?: number): Promise<RetrievalResult[]>;
  removeFile(filePath: string): void;
  clear(): void;
  getStats(): { fileCount: number; chunkCount: number };
}

export interface RAGPluginOptions extends RAGConfig {}
