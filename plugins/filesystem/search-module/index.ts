// ── Search Module — Plugin Entry ──────────────────────────────
// Full-text + semantic search across workspace files.
// Events: search:query → search:results, search:replace

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import { FileEvents } from "@core/events/file.events";
import { SearchEvents } from "@core/events/search.events";
import type {
  SearchQuery,
  SearchResults,
  SearchPluginOptions,
  ReplaceRequest,
  ReplaceResult,
  SemanticSearchQuery,
  SemanticSearchResult,
} from "./types";
import { searchFiles } from "./text-search";
import { computeReplaceAll } from "./replace";
import { SemanticSearchEngine } from "./semantic-search";

export type {
  SearchQuery,
  SearchResults,
  SearchMatch,
  SearchFileResult,
  SearchPluginOptions,
  ReplaceRequest,
  ReplaceChange,
  ReplaceResult,
  SemanticSearchQuery,
  SemanticSearchResult,
} from "./types";
export { searchFile, searchFiles } from "./text-search";
export { computeReplacements, computeReplaceAll } from "./replace";
export { SemanticSearchEngine } from "./semantic-search";

/** Search module API — exposed alongside the plugin */
export interface SearchModuleAPI {
  search(query: SearchQuery): SearchResults;
  replace(request: ReplaceRequest): Promise<ReplaceResult>;
  semanticSearch(query: SemanticSearchQuery): Promise<SemanticSearchResult[]>;
}

/**
 * Create the search plugin — listens for search:query events,
 * performs text search across cached file contents, emits search:results.
 */
export function createSearchPlugin(
  options: SearchPluginOptions = {},
): { plugin: MonacoPlugin; api: SearchModuleAPI } {
  const contextLines = options.contextLines ?? 2;

  let ctx: PluginContext | null = null;
  let semantic: SemanticSearchEngine | null = null;
  const disposables: IDisposable[] = [];

  // In-memory cache of file contents (populated via file:read events)
  const fileCache = new Map<string, string>();

  const api: SearchModuleAPI = {
    search(query: SearchQuery): SearchResults {
      return searchFiles(fileCache, query, contextLines);
    },

    async replace(request: ReplaceRequest): Promise<ReplaceResult> {
      const { result, newContents } = computeReplaceAll(fileCache, request);

      if (!request.preview && ctx) {
        // Apply changes by emitting write requests
        for (const [path, content] of newContents) {
          const data = new TextEncoder().encode(content);
          ctx.emit(FileEvents.WriteRequest, { path, data });
          // Update cache
          fileCache.set(path, content);
        }
      }

      return result;
    },

    async semanticSearch(query: SemanticSearchQuery): Promise<SemanticSearchResult[]> {
      return semantic?.search(query) ?? [];
    },
  };

  const plugin: MonacoPlugin = {
    id: "search-module",
    name: "Workspace Search",
    version: "1.0.0",
    description: "Full-text and semantic search across workspace files",
    dependencies: ["fs-module"],

    async onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      // Initialize semantic search engine
      if (options.enableSemantic) {
        semantic = new SemanticSearchEngine(ctx);
        // Listen for rag-module readiness
        disposables.push(
          ctx.on("rag:ready", () => semantic?.enable()),
        );
        disposables.push(
          ctx.on("rag:disabled", () => semantic?.disable()),
        );
      }

      // ── Cache file contents on read ────────────────────
      disposables.push(
        ctx.on(FileEvents.Read, (data) => {
          const { path, data: content } = data as { path: string; data: Uint8Array };
          try {
            fileCache.set(path, new TextDecoder().decode(content));
          } catch {
            // Binary file — skip
          }
        }),
      );

      // ── Update cache on write ──────────────────────────
      disposables.push(
        ctx.on(FileEvents.Written, (data) => {
          const { path } = data as { path: string };
          // Content will be refreshed on next read
          // We could also intercept write-request to update immediately
          void path;
        }),
      );

      // ── Remove from cache on delete ────────────────────
      disposables.push(
        ctx.on(FileEvents.Deleted, (data) => {
          const { path } = data as { path: string };
          fileCache.delete(path);
        }),
      );

      // ── Update cache on rename ─────────────────────────
      disposables.push(
        ctx.on(FileEvents.Renamed, (data) => {
          const { from, to } = data as { from: string; to: string };
          const content = fileCache.get(from);
          if (content !== undefined) {
            fileCache.delete(from);
            fileCache.set(to, content);
          }
        }),
      );

      // ── Handle search:query events ─────────────────────
      disposables.push(
        ctx.on(SearchEvents.Query, async (data) => {
          const query = data as SearchQuery;
          const results = searchFiles(fileCache, query, contextLines);
          ctx!.emit(SearchEvents.Results, results);
        }),
      );

      // ── Handle search:replace events ───────────────────
      disposables.push(
        ctx.on(SearchEvents.Replace, async (data) => {
          const request = data as ReplaceRequest;
          const result = await api.replace(request);
          ctx!.emit(SearchEvents.Results, { replace: true, ...result });
        }),
      );
    },

    onDispose() {
      for (const d of disposables) d.dispose();
      disposables.length = 0;
      fileCache.clear();
      semantic = null;
      ctx = null;
    },
  };

  return { plugin, api };
}
