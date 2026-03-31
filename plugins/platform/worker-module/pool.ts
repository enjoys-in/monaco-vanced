// ── Worker Module — WorkerPool ─────────────────────────────────

import type { PoolConfig, WorkerHandle, PoolStats, WorkerTask } from "./types";
import { WorkerRPC } from "./rpc";

export class WorkerPool {
  private readonly config: PoolConfig;
  private readonly handles: Map<string, WorkerHandle> = new Map();
  private readonly workers: Map<string, Worker> = new Map();
  private readonly rpcMap: Map<string, WorkerRPC> = new Map();
  private readonly idleQueue: string[] = [];
  private readonly waiters: Array<(workerId: string) => void> = [];
  private nextId = 0;
  private pendingCount = 0;

  constructor(config: PoolConfig) {
    this.config = config;
  }

  private spawn(): string {
    const id = `${this.config.name}-w${this.nextId++}`;
    const worker = new Worker(this.config.workerUrl, { name: id, type: "module" });
    const rpc = new WorkerRPC(worker);

    const handle: WorkerHandle = {
      id,
      status: "idle",
      terminate: () => {
        worker.terminate();
        (handle as { status: string }).status = "terminated";
        this.workers.delete(id);
        this.rpcMap.delete(id);
        this.handles.delete(id);
        const idx = this.idleQueue.indexOf(id);
        if (idx !== -1) this.idleQueue.splice(idx, 1);
      },
    };

    this.workers.set(id, worker);
    this.rpcMap.set(id, rpc);
    this.handles.set(id, handle);
    this.idleQueue.push(id);
    return id;
  }

  private async acquire(): Promise<string> {
    // Reuse idle worker
    if (this.idleQueue.length > 0) {
      return this.idleQueue.shift()!;
    }
    // Spawn new if under limit
    if (this.handles.size < this.config.maxWorkers) {
      const id = this.spawn();
      this.idleQueue.shift(); // remove from idle since we'll use it
      return id;
    }
    // Wait for one to free up
    return new Promise<string>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  private release(workerId: string): void {
    const handle = this.handles.get(workerId);
    if (!handle || handle.status === "terminated") return;
    (handle as { status: string }).status = "idle";

    if (this.waiters.length > 0) {
      const waiter = this.waiters.shift()!;
      waiter(workerId);
    } else {
      this.idleQueue.push(workerId);
    }
  }

  async run(task: WorkerTask): Promise<unknown> {
    this.pendingCount++;
    const workerId = await this.acquire();
    const handle = this.handles.get(workerId)!;
    (handle as { status: string }).status = "busy";
    this.pendingCount--;

    const rpc = this.rpcMap.get(workerId)!;

    try {
      const result = await rpc.call("execute", task.input, task.transfer, task.timeout);
      return result;
    } finally {
      this.release(workerId);
    }
  }

  terminate(): void {
    for (const handle of this.handles.values()) {
      handle.terminate();
    }
    this.idleQueue.length = 0;
    this.waiters.length = 0;
  }

  getStats(): PoolStats {
    let idle = 0;
    let busy = 0;
    for (const h of this.handles.values()) {
      if (h.status === "idle") idle++;
      else if (h.status === "busy") busy++;
    }
    return {
      name: this.config.name,
      total: this.handles.size,
      idle,
      busy,
      pending: this.pendingCount,
    };
  }
}
