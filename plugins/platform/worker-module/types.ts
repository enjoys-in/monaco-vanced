// ── Worker Module — Types ─────────────────────────────────────

export type TaskPriority = "high" | "normal" | "low";

export interface WorkerTask {
  id: string;
  poolId: string;
  input: unknown;
  priority: TaskPriority;
  timeout?: number;
  transfer?: Transferable[];
}

export interface WorkerHandle {
  id: string;
  status: "idle" | "busy" | "terminated";
  terminate(): void;
}

export interface PoolConfig {
  maxWorkers: number;
  workerUrl: string;
  name: string;
}

export interface PoolStats {
  name: string;
  total: number;
  idle: number;
  busy: number;
  pending: number;
}

export interface WorkerModuleConfig {
  defaultTimeout?: number;
}

export interface WorkerModuleAPI {
  createPool(config: PoolConfig): void;
  run(poolId: string, task: Omit<WorkerTask, "poolId">): Promise<unknown>;
  terminatePool(poolId: string): void;
  getPoolStats(poolId: string): PoolStats | null;
}
