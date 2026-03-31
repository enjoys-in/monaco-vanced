// ── Knowledge Graph Module ─────────────────────────────────
// Builds and maintains a code knowledge graph for AI context.

import type { MonacoPlugin, PluginContext } from "@core/types";
import { GraphEvents } from "@core/events";
import type { KnowledgeGraphAPI, KnowledgeGraphConfig } from "./types";
import { Graph } from "./graph";
import { IncrementalUpdater } from "./incremental";
import { serializeGraph, deserializeGraph } from "./serializer";

export function createKnowledgeGraphPlugin(
  config: KnowledgeGraphConfig = {},
): { plugin: MonacoPlugin; api: KnowledgeGraphAPI } {
  const graph = new Graph();
  let ctx: PluginContext | null = null;

  const updater = new IncrementalUpdater(graph, (filePath) => {
    ctx?.emit(GraphEvents.Updated, { filePath, stats: graph.getStats() });
  });

  const api: KnowledgeGraphAPI = {
    addNode: (node) => graph.addNode(node),
    addEdge: (edge) => graph.addEdge(edge),
    removeFile: (filePath) => updater.removeFile(filePath),
    getNode: (id) => graph.getNode(id),
    getEdgesFrom: (nodeId) => graph.getEdgesFrom(nodeId),
    getEdgesTo: (nodeId) => graph.getEdgesTo(nodeId),
    getRelated: (nodeId, maxDepth) => graph.getRelated(nodeId, maxDepth),
    query: (filePath) => graph.queryByFile(filePath),
    getStats: () => graph.getStats(),
    serialize: () => serializeGraph(graph),
    deserialize: (data) => deserializeGraph(graph, data),
    clear: () => graph.clear(),
  };

  const plugin: MonacoPlugin = {
    id: "knowledge-graph-module",
    name: "Knowledge Graph Module",
    version: "1.0.0",
    description: "Code knowledge graph for AI context enrichment",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;

      // Restore from localStorage
      const key = config.persistKey ?? "monaco-vanced:knowledge-graph";
      try {
        const saved = localStorage.getItem(key);
        if (saved) deserializeGraph(graph, saved);
      } catch {
        // ignore
      }

      // Listen for file-save events
      ctx.on("file:saved", (data?: unknown) => {
        const d = data as Record<string, unknown> | undefined;
        const filePath = d?.path as string;
        const content = d?.content as string;
        if (filePath && content) {
          updater.updateFile(filePath, content);
        }
      });

      ctx?.emit(GraphEvents.Built, { stats: graph.getStats() });
    },

    onDispose(): void {
      const key = config.persistKey ?? "monaco-vanced:knowledge-graph";
      try {
        localStorage.setItem(key, serializeGraph(graph));
      } catch {
        // ignore
      }
      ctx = null;
    },
  };

  return { plugin, api };
}

export type { GraphNode, GraphEdge, EdgeKind, GraphData, KnowledgeGraphConfig, KnowledgeGraphAPI } from "./types";
export { Graph } from "./graph";
export { buildFromSource } from "./builder";
export { IncrementalUpdater } from "./incremental";
export { serializeGraph, deserializeGraph } from "./serializer";
