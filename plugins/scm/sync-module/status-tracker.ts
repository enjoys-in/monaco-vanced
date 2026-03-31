// ── Status Tracker ─────────────────────────────────────────
// Per-file sync status tracking.

import type { SyncStatus } from "./types";

export class StatusTracker {
  private statuses = new Map<string, SyncStatus>();

  set(uri: string, status: SyncStatus): void {
    this.statuses.set(uri, status);
  }

  get(uri: string): SyncStatus {
    return this.statuses.get(uri) ?? "synced";
  }

  getAll(): Map<string, SyncStatus> {
    return new Map(this.statuses);
  }

  getPending(): string[] {
    return Array.from(this.statuses.entries())
      .filter(([, s]) => s === "pending")
      .map(([uri]) => uri);
  }

  clear(): void {
    this.statuses.clear();
  }
}
