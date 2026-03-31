// ── Capturer ───────────────────────────────────────────────
// Creates snapshots from current editor state.

import type { Snapshot } from "./types";
import { SnapshotStore } from "./store";

export class Capturer {
  private versionCounters = new Map<string, number>();

  constructor(private store: SnapshotStore) {}

  capture(file: string, content: string, cursorLine?: number, scrollTop?: number): Snapshot {
    const version = (this.versionCounters.get(file) ?? 0) + 1;
    this.versionCounters.set(file, version);

    const snapshot: Snapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      content,
      timestamp: Date.now(),
      version,
      cursorLine,
      scrollTop,
    };

    this.store.add(snapshot);
    return snapshot;
  }
}
