// ── Versioning ─────────────────────────────────────────────
// File-level version tracking for snapshot history.

import type { Snapshot } from "./types";

export function getVersions(snapshots: Snapshot[]): number[] {
  return snapshots.map((s) => s.version).sort((a, b) => a - b);
}

export function findByVersion(snapshots: Snapshot[], version: number): Snapshot | undefined {
  return snapshots.find((s) => s.version === version);
}

export function getLatest(snapshots: Snapshot[]): Snapshot | undefined {
  if (snapshots.length === 0) return undefined;
  return snapshots[snapshots.length - 1];
}
