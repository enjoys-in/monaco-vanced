// ── Task Module — Shared Types ───────────────────────────────

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type TaskPriority = "high" | "normal" | "low";

export interface BackgroundTask {
  id: string;
  label: string;
  status: TaskStatus;
  progress: number;
  cancellable: boolean;
  priority: TaskPriority;
  startedAt?: number;
  completedAt?: number;
  /** The actual work to execute */
  execute?: (signal: AbortSignal) => Promise<void>;
}

export interface TaskConfig {
  maxParallel?: number;
  persistKey?: string;
}

export interface TaskModuleAPI {
  enqueue(task: Omit<BackgroundTask, "status" | "progress" | "startedAt" | "completedAt">): BackgroundTask;
  cancel(id: string): void;
  getAll(): BackgroundTask[];
  getRunning(): BackgroundTask[];
  getProgress(id: string): number;
  onProgress(id: string, handler: (percent: number) => void): () => void;
}
