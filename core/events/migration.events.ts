// ── Migration Events ─────────────────────────────────────────

export enum MigrationEvents {
  Started = "migration:started",
  StepCompleted = "migration:step-completed",
  Completed = "migration:completed",
  Failed = "migration:failed",
  Rollback = "migration:rollback",
}
