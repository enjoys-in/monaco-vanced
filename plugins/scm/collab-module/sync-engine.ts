// ── Sync Engine ────────────────────────────────────────────
// Bridges CRDT/OT operations with transport layer.

import type { CollabOperation } from "./types";
import { CRDTDocument } from "./crdt";
import { CollabTransport } from "./transport";

export class SyncEngine {
  private doc: CRDTDocument;
  private transport: CollabTransport;
  private pendingOps: CollabOperation[] = [];

  constructor(transport: CollabTransport) {
    this.doc = new CRDTDocument();
    this.transport = transport;

    transport.on("operation", (data) => {
      const op = data as CollabOperation;
      this.doc.apply(op);
    });
  }

  applyLocal(op: CollabOperation): string {
    const result = this.doc.apply(op);
    this.pendingOps.push(op);
    this.transport.send("operation", op);
    return result;
  }

  getContent(): string {
    return this.doc.getContent();
  }

  setContent(content: string): void {
    this.doc.setContent(content);
  }

  flush(): void {
    this.pendingOps = [];
  }
}
