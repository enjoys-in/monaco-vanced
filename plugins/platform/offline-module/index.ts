// ── Offline Module — Plugin Entry ─────────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { OfflineConfig, OfflineModuleAPI, OnlineStatus, QueuedOperation } from "./types";
import { OfflineEvents } from "@core/events";

export type { OfflineConfig, OfflineModuleAPI, OnlineStatus, QueuedOperation } from "./types";

let _opCounter = 0;

export function createOfflinePlugin(config: OfflineConfig = {}): {
  plugin: MonacoPlugin;
  api: OfflineModuleAPI;
} {
  const maxQueueSize = config.maxQueueSize ?? 500;
  const autoSync = config.autoSync !== false;
  const queue: QueuedOperation[] = [];
  const syncHandlers = new Map<string, (op: QueuedOperation) => Promise<void>>();
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;
  let status: OnlineStatus = typeof navigator !== "undefined" ? (navigator.onLine ? "online" : "offline") : "online";

  async function syncQueue(): Promise<void> {
    if (status === "offline") return;
    ctx?.emit(OfflineEvents.SyncStarted, { pending: queue.length });

    const toProcess = [...queue];
    const failed: QueuedOperation[] = [];

    for (const op of toProcess) {
      const handler = syncHandlers.get(op.type);
      if (!handler) {
        failed.push(op);
        continue;
      }
      try {
        await handler(op);
        // Remove from queue on success
        const idx = queue.indexOf(op);
        if (idx >= 0) queue.splice(idx, 1);
      } catch {
        op.retries++;
        failed.push(op);
      }
    }

    if (failed.length > 0) {
      ctx?.emit(OfflineEvents.SyncFailed, { failed: failed.length });
    } else {
      ctx?.emit(OfflineEvents.SyncCompleted, { synced: toProcess.length });
    }
  }

  const api: OfflineModuleAPI = {
    getStatus(): OnlineStatus {
      return status;
    },

    enqueue(type: string, payload: unknown): string {
      const id = `op-${++_opCounter}-${Date.now()}`;
      const op: QueuedOperation = { id, type, payload, timestamp: Date.now(), retries: 0 };

      // Drop oldest if queue is full
      if (queue.length >= maxQueueSize) {
        queue.shift();
      }

      queue.push(op);
      ctx?.emit(OfflineEvents.QueuedOperation, { id, type });
      return id;
    },

    getQueue(): QueuedOperation[] {
      return [...queue];
    },

    dequeue(id: string): void {
      const idx = queue.findIndex((op) => op.id === id);
      if (idx >= 0) queue.splice(idx, 1);
    },

    async sync(): Promise<void> {
      await syncQueue();
    },

    clearQueue(): void {
      queue.length = 0;
    },

    registerSyncHandler(type: string, handler: (op: QueuedOperation) => Promise<void>): void {
      syncHandlers.set(type, handler);
    },
  };

  const plugin: MonacoPlugin = {
    id: "offline-module",
    name: "Offline Module",
    version: "1.0.0",
    description: "Offline-first capability with operation queuing and auto-sync",

    onMount(pluginCtx) {
      ctx = pluginCtx;

      if (typeof window !== "undefined") {
        const onOnline = () => {
          status = "online";
          ctx?.emit(OfflineEvents.StatusChanged, { status: "online" });
          if (autoSync && queue.length > 0) {
            syncQueue().catch(() => {});
          }
        };
        const onOffline = () => {
          status = "offline";
          ctx?.emit(OfflineEvents.StatusChanged, { status: "offline" });
        };

        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
        disposables.push({
          dispose() {
            window.removeEventListener("online", onOnline);
            window.removeEventListener("offline", onOffline);
          },
        });
      }
    },

    onDispose() {
      for (const d of disposables) d.dispose();
      disposables.length = 0;
      queue.length = 0;
      syncHandlers.clear();
      ctx = null;
    },
  };

  return { plugin, api };
}
