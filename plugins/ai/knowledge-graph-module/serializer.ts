// ── Serializer ─────────────────────────────────────────────
// JSON serialization / deserialization of graph data.

import type { GraphEdge, GraphNode } from "./types";
import { Graph } from "./graph";

interface SerializedGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function serializeGraph(graph: Graph): string {
  const nodes = Array.from(graph.nodes.values());
  const edges: GraphEdge[] = [];
  for (const node of nodes) {
    edges.push(...graph.getEdgesFrom(node.id));
  }
  const data: SerializedGraph = { nodes, edges };
  return JSON.stringify(data);
}

export function deserializeGraph(graph: Graph, data: string): void {
  graph.clear();
  const parsed = JSON.parse(data) as SerializedGraph;
  for (const node of parsed.nodes) {
    graph.addNode(node);
  }
  for (const edge of parsed.edges) {
    graph.addEdge(edge);
  }
}
