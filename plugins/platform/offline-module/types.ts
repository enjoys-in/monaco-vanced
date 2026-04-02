// ── Offline Module — Types ───────────────────────────────────

export type OnlineStatus = "online" | "offline";

export interface QueuedOperation {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  retries: number;
}

export interface OfflineConfig {
  /** Max number of queued operations before dropping oldest */
  maxQueueSize?: number;
  /** Auto-sync when coming back online (default: true) */
  autoSync?: boolean;
}

export interface OfflineModuleAPI {
  /** Get current online/offline status */
  getStatus(): OnlineStatus;
  /** Queue an operation for later sync */
  enqueue(type: string, payload: unknown): string;
  /** Get all queued operations */
  getQueue(): QueuedOperation[];
  /** Remove a queued operation */
  dequeue(id: string): void;
  /** Manually trigger sync of queued operations */
  sync(): Promise<void>;
  /** Clear the entire queue */
  clearQueue(): void;
  /** Register a handler for a specific operation type */
  registerSyncHandler(type: string, handler: (op: QueuedOperation) => Promise<void>): void;
}
