// ── Knowledge Graph Types ──────────────────────────────────

export type EdgeKind = "imports" | "exports" | "calls" | "extends" | "implements" | "uses" | "defines" | "references";

export interface GraphNode {
  readonly id: string;
  readonly filePath: string;
  readonly symbol: string;
  readonly kind: string; // function, class, variable, etc.
  readonly line?: number;
}

export interface GraphEdge {
  readonly source: string; // node id
  readonly target: string; // node id
  readonly kind: EdgeKind;
  readonly weight?: number;
}

export interface GraphData {
  readonly nodes: Map<string, GraphNode>;
  readonly edges: GraphEdge[];
}

export interface KnowledgeGraphConfig {
  readonly maxNodes?: number;
  readonly persistKey?: string;
}

export interface KnowledgeGraphAPI {
  addNode(node: GraphNode): void;
  addEdge(edge: GraphEdge): void;
  removeFile(filePath: string): void;
  getNode(id: string): GraphNode | undefined;
  getEdgesFrom(nodeId: string): GraphEdge[];
  getEdgesTo(nodeId: string): GraphEdge[];
  getRelated(nodeId: string, maxDepth?: number): GraphNode[];
  query(filePath: string): GraphNode[];
  getStats(): { nodeCount: number; edgeCount: number };
  serialize(): string;
  deserialize(data: string): void;
  clear(): void;
}
