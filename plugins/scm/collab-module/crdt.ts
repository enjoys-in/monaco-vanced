// ── CRDT (Simplified) ──────────────────────────────────────
// Simplified CRDT-style conflict-free merge for collaborative text.

import type { CollabOperation } from "./types";

export class CRDTDocument {
  private operations: CollabOperation[] = [];
  private content = "";

  apply(op: CollabOperation): string {
    this.operations.push(op);

    switch (op.type) {
      case "insert":
        if (op.content != null) {
          const pos = Math.min(op.position, this.content.length);
          this.content = this.content.slice(0, pos) + op.content + this.content.slice(pos);
        }
        break;
      case "delete":
        if (op.length != null) {
          const pos = Math.min(op.position, this.content.length);
          this.content = this.content.slice(0, pos) + this.content.slice(pos + op.length);
        }
        break;
      case "retain":
        // No-op for content, used for cursor tracking
        break;
    }

    return this.content;
  }

  getContent(): string {
    return this.content;
  }

  setContent(content: string): void {
    this.content = content;
    this.operations = [];
  }

  getHistory(): CollabOperation[] {
    return [...this.operations];
  }
}
