// ── Worker Module — WorkerRPC ──────────────────────────────────

import { extractTransferables } from "./transferable";

interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timer?: ReturnType<typeof setTimeout>;
}

export class WorkerRPC {
  private readonly worker: Worker;
  private readonly pending = new Map<string, PendingCall>();
  private nextId = 0;

  constructor(worker: Worker) {
    this.worker = worker;
    this.worker.addEventListener("message", this.handleMessage);
  }

  private handleMessage = (e: MessageEvent): void => {
    const { id, result, error } = e.data ?? {};
    if (!id) return;
    const pending = this.pending.get(id);
    if (!pending) return;
    this.pending.delete(id);
    if (pending.timer) clearTimeout(pending.timer);
    if (error) {
      pending.reject(new Error(error));
    } else {
      pending.resolve(result);
    }
  };

  call(
    method: string,
    args: unknown,
    transfer?: Transferable[],
    timeout?: number,
  ): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      const id = `rpc-${this.nextId++}`;
      const pending: PendingCall = { resolve, reject };

      if (timeout && timeout > 0) {
        pending.timer = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error(`RPC call "${method}" timed out after ${timeout}ms`));
        }, timeout);
      }

      this.pending.set(id, pending);

      const transferables = transfer ?? extractTransferables(args);
      this.worker.postMessage({ id, method, args }, transferables);
    });
  }

  dispose(): void {
    this.worker.removeEventListener("message", this.handleMessage);
    for (const [, p] of this.pending) {
      if (p.timer) clearTimeout(p.timer);
      p.reject(new Error("RPC disposed"));
    }
    this.pending.clear();
  }
}
