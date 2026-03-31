// ── Worker Module — Plugin Entry ──────────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { WorkerModuleConfig, WorkerModuleAPI, PoolConfig, WorkerTask } from "./types";
import { WorkerPool } from "./pool";

export type { WorkerModuleConfig, WorkerModuleAPI, PoolConfig, PoolStats, WorkerTask, WorkerHandle, TaskPriority } from "./types";
export { WorkerPool } from "./pool";
export { TaskScheduler } from "./scheduler";
export { WorkerRPC } from "./rpc";
export { isTransferable, extractTransferables } from "./transferable";

export function createWorkerPlugin(_config: WorkerModuleConfig = {}): {
  plugin: MonacoPlugin;
  api: WorkerModuleAPI;
} {
  const pools = new Map<string, WorkerPool>();
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;

  const api: WorkerModuleAPI = {
    createPool(poolConfig: PoolConfig): void {
      if (pools.has(poolConfig.name)) {
        throw new Error(`Worker pool "${poolConfig.name}" already exists`);
      }
      pools.set(poolConfig.name, new WorkerPool(poolConfig));
    },

    async run(poolId: string, task: Omit<WorkerTask, "poolId">): Promise<unknown> {
      const pool = pools.get(poolId);
      if (!pool) throw new Error(`Worker pool "${poolId}" not found`);

      const fullTask: WorkerTask = { ...task, poolId };
      try {
        const result = await pool.run(fullTask);
        ctx?.emit("worker:complete", { taskId: task.id, poolId, result });
        return result;
      } catch (err) {
        ctx?.emit("worker:error", { taskId: task.id, poolId, error: String(err) });
        throw err;
      }
    },

    terminatePool(poolId: string): void {
      const pool = pools.get(poolId);
      if (!pool) return;
      pool.terminate();
      pools.delete(poolId);
    },

    getPoolStats(poolId: string) {
      return pools.get(poolId)?.getStats() ?? null;
    },
  };

  const plugin: MonacoPlugin = {
    id: "platform.worker",
    name: "Worker Module",
    version: "1.0.0",
    description: "Web Worker pool management with RPC and priority scheduling",

    onMount(_ctx: PluginContext) {
      ctx = _ctx;
      ctx.emit("worker:spawn", { status: "ready" });
    },

    onDispose() {
      for (const pool of pools.values()) pool.terminate();
      pools.clear();
      disposables.forEach((d) => d.dispose());
      ctx = null;
    },
  };

  return { plugin, api };
}
