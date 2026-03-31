// ── Snapshot Module Types ──────────────────────────────────

export interface Snapshot {
  readonly id: string;
  readonly file: string;
  readonly content: string;
  readonly timestamp: number;
  readonly version: number;
  readonly cursorLine?: number;
  readonly scrollTop?: number;
}

export interface SessionState {
  readonly openTabs: string[];
  readonly activeTab: string | null;
  readonly splitLayout: unknown;
  readonly sidebarView: string | null;
  readonly scrollPositions: Record<string, number>;
}

export interface SnapshotConfig {
  readonly maxSnapshots?: number;
  readonly persistKey?: string;
  readonly debounceMs?: number;
}

export interface SnapshotModuleAPI {
  capture(file: string, content: string, cursor?: number): Snapshot;
  getSnapshots(file: string): Snapshot[];
  getSnapshot(id: string): Snapshot | undefined;
  restore(id: string): Snapshot | undefined;
  getVersions(file: string): number[];
  timeTravelTo(file: string, version: number): Snapshot | undefined;
  saveSession(state: SessionState): void;
  restoreSession(): SessionState | null;
  undo(file: string): Snapshot | undefined;
  clear(): void;
}
