// ── Migration Module — Types ─────────────────────────────────

export type MigrationStatus = "pending" | "running" | "completed" | "failed" | "rolled-back";

export interface MigrationStep {
  id: string;
  name: string;
  version: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

export interface MigrationRecord {
  stepId: string;
  version: string;
  status: MigrationStatus;
  appliedAt: number;
  durationMs: number;
  error?: string;
}

export interface MigrationConfig {
  /** Storage key for tracking migration state */
  storageKey?: string;
}

export interface MigrationModuleAPI {
  /** Register a migration step */
  register(step: MigrationStep): void;
  /** Run all pending migrations up to the current version */
  migrate(): Promise<MigrationRecord[]>;
  /** Rollback the last N applied migrations (default 1) */
  rollback(count?: number): Promise<MigrationRecord[]>;
  /** Get the history of applied migrations */
  getHistory(): MigrationRecord[];
  /** Get the current schema version */
  getCurrentVersion(): string | null;
  /** Check if there are pending migrations */
  hasPending(): boolean;
  /** Get all registered migration steps */
  getSteps(): MigrationStep[];
}
