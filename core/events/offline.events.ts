// ── Offline Events ───────────────────────────────────────────

export enum OfflineEvents {
  StatusChanged = "offline:status-changed",
  SyncStarted = "offline:sync-started",
  SyncCompleted = "offline:sync-completed",
  SyncFailed = "offline:sync-failed",
  QueuedOperation = "offline:queued-op",
}
