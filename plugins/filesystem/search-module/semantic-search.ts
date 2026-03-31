// ── Search Module — Semantic Search ───────────────────────────
// Natural language search — delegates to rag-module if available.

import type { SemanticSearchQuery, SemanticSearchResult } from "./types";
import type { PluginContext } from "@core/types";
import { RagEvents } from "@core/events";

/**
 * Semantic search support — requires rag-module to be active.
 * If rag-module is not available, returns empty results.
 */
export class SemanticSearchEngine {
  private enabled = false;

  constructor(private ctx: PluginContext) {}

  /** Check if semantic search is available */
  isAvailable(): boolean {
    return this.enabled;
  }

  /** Enable semantic search (called when rag-module signals readiness) */
  enable(): void {
    this.enabled = true;
  }

  /** Disable semantic search */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Perform a semantic (vector similarity) search.
   * Emits a rag:query event and waits for rag:results.
   */
  async search(query: SemanticSearchQuery): Promise<SemanticSearchResult[]> {
    if (!this.enabled) {
      return [];
    }

    return new Promise<SemanticSearchResult[]>((resolve) => {
      const timeout = setTimeout(() => {
        sub.dispose();
        resolve([]);
      }, 10_000);

      const sub = this.ctx.on(RagEvents.Results, (data) => {
        clearTimeout(timeout);
        sub.dispose();

        const results = (data as { results: SemanticSearchResult[] }).results ?? [];
        const filtered = results
          .filter((r) => r.score >= (query.threshold ?? 0.5))
          .slice(0, query.limit ?? 10);

        resolve(filtered);
      });

      this.ctx.emit(RagEvents.Query, {
        query: query.query,
        limit: query.limit ?? 10,
        fileTypes: query.fileTypes,
      });
    });
  }
}
