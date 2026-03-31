// ── Incremental ────────────────────────────────────────────
// Incremental graph updates on file save / delete.

import { Graph } from "./graph";
import { buildFromSource } from "./builder";

export class IncrementalUpdater {
  private graph: Graph;
  private onUpdate?: (filePath: string) => void;

  constructor(graph: Graph, onUpdate?: (filePath: string) => void) {
    this.graph = graph;
    this.onUpdate = onUpdate;
  }

  updateFile(filePath: string, content: string): void {
    buildFromSource(filePath, content, this.graph);
    this.onUpdate?.(filePath);
  }

  removeFile(filePath: string): void {
    this.graph.removeFile(filePath);
    this.onUpdate?.(filePath);
  }
}
