// ── Graph ──────────────────────────────────────────────────
// Adjacency list graph with node/edge management.

import type { GraphEdge, GraphNode } from "./types";

export class Graph {
  readonly nodes = new Map<string, GraphNode>();
  private outEdges = new Map<string, GraphEdge[]>();
  private inEdges = new Map<string, GraphEdge[]>();
  private fileIndex = new Map<string, Set<string>>();

  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.fileIndex.has(node.filePath)) {
      this.fileIndex.set(node.filePath, new Set());
    }
    this.fileIndex.get(node.filePath)!.add(node.id);
  }

  addEdge(edge: GraphEdge): void {
    if (!this.outEdges.has(edge.source)) this.outEdges.set(edge.source, []);
    if (!this.inEdges.has(edge.target)) this.inEdges.set(edge.target, []);
    this.outEdges.get(edge.source)!.push(edge);
    this.inEdges.get(edge.target)!.push(edge);
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  getEdgesFrom(nodeId: string): GraphEdge[] {
    return this.outEdges.get(nodeId) ?? [];
  }

  getEdgesTo(nodeId: string): GraphEdge[] {
    return this.inEdges.get(nodeId) ?? [];
  }

  getRelated(nodeId: string, maxDepth = 2): GraphNode[] {
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }];
    const results: GraphNode[] = [];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      if (id !== nodeId) {
        const node = this.nodes.get(id);
        if (node) results.push(node);
      }

      if (depth >= maxDepth) continue;

      for (const edge of this.getEdgesFrom(id)) {
        if (!visited.has(edge.target)) queue.push({ id: edge.target, depth: depth + 1 });
      }
      for (const edge of this.getEdgesTo(id)) {
        if (!visited.has(edge.source)) queue.push({ id: edge.source, depth: depth + 1 });
      }
    }

    return results;
  }

  queryByFile(filePath: string): GraphNode[] {
    const ids = this.fileIndex.get(filePath);
    if (!ids) return [];
    return Array.from(ids).map((id) => this.nodes.get(id)!).filter(Boolean);
  }

  removeFile(filePath: string): void {
    const ids = this.fileIndex.get(filePath);
    if (!ids) return;

    for (const id of ids) {
      this.nodes.delete(id);
      this.outEdges.delete(id);
      this.inEdges.delete(id);
    }

    // Clean edges referencing removed nodes
    for (const [key, edges] of this.outEdges) {
      this.outEdges.set(key, edges.filter((e) => !ids.has(e.target)));
    }
    for (const [key, edges] of this.inEdges) {
      this.inEdges.set(key, edges.filter((e) => !ids.has(e.source)));
    }

    this.fileIndex.delete(filePath);
  }

  clear(): void {
    this.nodes.clear();
    this.outEdges.clear();
    this.inEdges.clear();
    this.fileIndex.clear();
  }

  getStats(): { nodeCount: number; edgeCount: number } {
    let edgeCount = 0;
    for (const edges of this.outEdges.values()) edgeCount += edges.length;
    return { nodeCount: this.nodes.size, edgeCount };
  }
}
