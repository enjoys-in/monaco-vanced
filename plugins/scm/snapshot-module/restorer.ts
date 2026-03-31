// ── Restorer ───────────────────────────────────────────────
// Restores editor state from a snapshot.

import type { Snapshot } from "./types";

export interface RestoreResult {
  readonly snapshot: Snapshot;
  readonly applied: boolean;
}

export function prepareRestore(snapshot: Snapshot): RestoreResult {
  return { snapshot, applied: true };
}
