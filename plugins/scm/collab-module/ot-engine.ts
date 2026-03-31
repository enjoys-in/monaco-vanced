// ── OT Engine (Simplified) ─────────────────────────────────
// Operational Transform engine for sequential conflict resolution.

import type { CollabOperation } from "./types";

/**
 * Transform two concurrent operations so they can be applied in either order.
 * Returns [op1', op2'] — transformed versions.
 */
export function transform(
  op1: CollabOperation,
  op2: CollabOperation,
): [CollabOperation, CollabOperation] {
  if (op1.type === "insert" && op2.type === "insert") {
    if (op1.position <= op2.position) {
      return [op1, { ...op2, position: op2.position + (op1.content?.length ?? 0) }];
    } else {
      return [{ ...op1, position: op1.position + (op2.content?.length ?? 0) }, op2];
    }
  }

  if (op1.type === "delete" && op2.type === "delete") {
    if (op1.position <= op2.position) {
      const overlap = Math.max(0, (op1.position + (op1.length ?? 0)) - op2.position);
      return [
        op1,
        { ...op2, position: op2.position - (op1.length ?? 0) + overlap, length: (op2.length ?? 0) - overlap },
      ];
    }
    return transform(op2, op1).reverse() as [CollabOperation, CollabOperation];
  }

  if (op1.type === "insert" && op2.type === "delete") {
    if (op1.position <= op2.position) {
      return [op1, { ...op2, position: op2.position + (op1.content?.length ?? 0) }];
    } else if (op1.position >= op2.position + (op2.length ?? 0)) {
      return [{ ...op1, position: op1.position - (op2.length ?? 0) }, op2];
    }
    return [{ ...op1, position: op2.position }, op2];
  }

  // op1 is delete, op2 is insert — reverse transform
  const [t2, t1] = transform(op2, op1);
  return [t1, t2];
}
