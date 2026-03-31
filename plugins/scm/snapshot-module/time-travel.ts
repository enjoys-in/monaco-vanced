// ── Time Travel ────────────────────────────────────────────
// Navigate through snapshot history for a file.

import type { Snapshot } from "./types";

export class TimeTraveler {
  private position = new Map<string, number>();

  setPosition(file: string, version: number): void {
    this.position.set(file, version);
  }

  getPosition(file: string): number | undefined {
    return this.position.get(file);
  }

  findSnapshot(snapshots: Snapshot[], version: number): Snapshot | undefined {
    return snapshots.find((s) => s.version === version);
  }

  next(snapshots: Snapshot[], currentVersion: number): Snapshot | undefined {
    const idx = snapshots.findIndex((s) => s.version === currentVersion);
    return idx >= 0 && idx < snapshots.length - 1 ? snapshots[idx + 1] : undefined;
  }

  prev(snapshots: Snapshot[], currentVersion: number): Snapshot | undefined {
    const idx = snapshots.findIndex((s) => s.version === currentVersion);
    return idx > 0 ? snapshots[idx - 1] : undefined;
  }
}
