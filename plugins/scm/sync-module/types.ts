// ── Sync Module Types ──────────────────────────────────────

export type SyncStatus = "synced" | "pending" | "conflict" | "error";
export type SyncStrategy = "last-write-wins" | "merge" | "ask";

export interface QueueEntry {
  readonly id: string;
  readonly uri: string;
  readonly operation: "write" | "delete" | "rename";
  readonly data?: unknown;
  readonly timestamp: number;
  readonly retryCount: number;
}

export interface SyncConfig {
  readonly strategy?: SyncStrategy;
  readonly maxRetries?: number;
  readonly retryDelay?: number;
  readonly persistKey?: string;
}

export interface SyncModuleAPI {
  getStatus(uri: string): SyncStatus;
  forceSync(uri?: string): Promise<void>;
  setStrategy(strategy: SyncStrategy): void;
  getQueue(): QueueEntry[];
  enqueue(uri: string, operation: QueueEntry["operation"], data?: unknown): void;
  isOnline(): boolean;
}
