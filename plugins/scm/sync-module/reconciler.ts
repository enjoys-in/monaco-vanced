// ── Reconciler ─────────────────────────────────────────────
// Conflict detection and resolution strategies.

import type { SyncStrategy } from "./types";

export interface ConflictInfo {
  readonly uri: string;
  readonly localVersion: string;
  readonly remoteVersion: string;
}

export function resolveConflict(
  conflict: ConflictInfo,
  strategy: SyncStrategy,
): { result: "local" | "remote" | "ask"; content?: string } {
  switch (strategy) {
    case "last-write-wins":
      return { result: "local" };
    case "merge":
      // Simplified — real impl would use 3-way merge
      return { result: "local", content: conflict.localVersion };
    case "ask":
      return { result: "ask" };
  }
}
