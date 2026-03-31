// ── FS Module — Conflict Detection ────────────────────────────
// Detects write conflicts by comparing modified timestamps.

import type { FSAdapter, FileStat } from "./types";

export interface ConflictInfo {
  path: string;
  localModified: number;
  remoteModified: number;
}

/**
 * Tracks known file timestamps and detects conflicts when the remote
 * file has been modified since last read. Used before writes to prevent
 * overwriting concurrent changes.
 */
export class ConflictDetector {
  /** path → last known modified timestamp */
  private knownTimestamps = new Map<string, number>();

  /** Record the timestamp after a successful read */
  markRead(path: string, modified: number): void {
    this.knownTimestamps.set(path, modified);
  }

  /** Remove tracking for a path (e.g. on delete) */
  forget(path: string): void {
    this.knownTimestamps.delete(path);
  }

  /**
   * Check if a file has been modified externally since our last read.
   * Returns conflict info if yes, null if no conflict or file is new.
   */
  async check(adapter: FSAdapter, path: string): Promise<ConflictInfo | null> {
    const knownTs = this.knownTimestamps.get(path);
    if (knownTs === undefined) return null; // No previous read — no conflict

    let remoteStat: FileStat;
    try {
      remoteStat = await adapter.stat(path);
    } catch {
      return null; // File may have been deleted — not a conflict
    }

    if (remoteStat.modified > knownTs) {
      return {
        path,
        localModified: knownTs,
        remoteModified: remoteStat.modified,
      };
    }

    return null;
  }

  /** Clear all tracked timestamps */
  clear(): void {
    this.knownTimestamps.clear();
  }
}
