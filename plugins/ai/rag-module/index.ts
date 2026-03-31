// ── RAG Module ─────────────────────────────────────────────
// Vector index of workspace. Embedding + retrieval for AI context.

import type { MonacoPlugin, PluginContext } from "@core/types";
import { RagEvents } from "@core/events";
import type { RAGModuleAPI, RAGPluginOptions, RetrievalResult } from "./types";
import { chunkFile } from "./chunker";
import { Embedder } from "./embedder";
import { VectorStore } from "./vector-store";
import { Retriever } from "./retriever";

export function createRAGPlugin(
  config: RAGPluginOptions,
): { plugin: MonacoPlugin; api: RAGModuleAPI } {
  const {
    chunkSize = 30,
    chunkOverlap = 5,
    topK = 5,
    minScore = 0.3,
  } = config;

  const embedder = new Embedder(config.embedding);
  const store = new VectorStore();
  const retriever = new Retriever(embedder, store, topK, minScore);
  let ctx: PluginContext | null = null;

  async function indexFile(
    filePath: string,
    content: string,
    language: string,
  ): Promise<void> {
    // Remove old chunks for this file
    store.removeFile(filePath);

    // Chunk the file
    const chunks = chunkFile(filePath, content, language, chunkSize, chunkOverlap);

    // Generate embeddings in batch
    const texts = chunks.map((c) => c.content);
    try {
      const embeddings = await embedder.embedBatch(texts);
      const embeddedChunks = chunks.map((c, i) => ({
        ...c,
        embedding: embeddings[i],
      }));
      store.addBatch(embeddedChunks);
    } catch (err) {
      ctx?.notify(`RAG indexing failed for ${filePath}: ${(err as Error).message}`, "error");
    }
  }

  const api: RAGModuleAPI = {
    async index(filePath, content, language): Promise<void> {
      await indexFile(filePath, content, language);
      ctx?.emit(RagEvents.Indexed, { filePath, chunkCount: store.getByFile(filePath).length });
    },

    async indexBulk(files): Promise<void> {
      for (const file of files) {
        await indexFile(file.path, file.content, file.language);
      }
      ctx?.emit(RagEvents.Indexed, { fileCount: files.length, stats: store.getStats() });
    },

    async query(text: string, k?: number): Promise<RetrievalResult[]> {
      const results = await retriever.query(text, k);
      ctx?.emit(RagEvents.Results, { query: text, resultCount: results.length });
      return results;
    },

    removeFile(filePath: string): void {
      store.removeFile(filePath);
    },

    clear(): void {
      store.clear();
    },

    getStats() {
      return store.getStats();
    },
  };

  const plugin: MonacoPlugin = {
    id: "rag-module",
    name: "RAG Module",
    version: "1.0.0",
    description: "Workspace vector index with embedding-based retrieval for AI context",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;

      // Listen for rag query events (from search-module or ai-module)
      ctx.addDisposable(
        ctx.on(RagEvents.Query, async (data) => {
          const { query, topK: k } = data as { query: string; topK?: number };
          const results = await api.query(query, k);
          ctx?.emit(RagEvents.Results, { query, results });
        }),
      );
    },

    onDispose(): void {
      embedder.dispose();
      store.dispose();
      ctx = null;
    },
  };

  return { plugin, api };
}

// ── Re-exports ─────────────────────────────────────────────

export type {
  Chunk,
  EmbeddingConfig,
  RAGConfig,
  RAGModuleAPI,
  RAGPluginOptions,
  RetrievalResult,
} from "./types";

export { chunkFile } from "./chunker";
export { Embedder } from "./embedder";
export { VectorStore } from "./vector-store";
export { Retriever } from "./retriever";
