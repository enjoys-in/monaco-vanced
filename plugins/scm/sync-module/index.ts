// ── Sync Module ────────────────────────────────────────────
// Offline-first editing with background sync and conflict resolution.

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { SyncConfig, SyncModuleAPI, SyncStrategy } from "./types";
import { SyncEvents } from "@core/events";
import { OfflineQueue } from "./queue";
import { StatusTracker } from "./status-tracker";

export function createSyncPlugin(
  config: SyncConfig = {},
): { plugin: MonacoPlugin; api: SyncModuleAPI } {
  const queue = new OfflineQueue(config.persistKey);
  const tracker = new StatusTracker();
  let strategy: SyncStrategy = config.strategy ?? "last-write-wins";
  let online = typeof navigator !== "undefined" ? navigator.onLine : true;
  let ctx: PluginContext | null = null;

  const api: SyncModuleAPI = {
    getStatus: (uri) => tracker.get(uri),

    async forceSync(uri) {
      if (!online) return;
      ctx?.emit(SyncEvents.Start, { queueLength: queue.length });
      let synced = 0;
      let failed = 0;

      while (queue.length > 0) {
        const entry = queue.dequeue();
        if (!entry) break;
        if (uri && entry.uri !== uri) {
          queue.enqueue(entry.uri, entry.operation, entry.data);
          continue;
        }
        try {
          // In real impl, would call FS adapter
          tracker.set(entry.uri, "synced");
          synced++;
        } catch {
          tracker.set(entry.uri, "error");
          failed++;
        }
      }

      ctx?.emit(SyncEvents.Complete, { synced, failed });
    },

    setStrategy(s) { strategy = s; void strategy; },
    getQueue: () => queue.getAll(),

    enqueue(uri, operation, data) {
      queue.enqueue(uri, operation, data);
      tracker.set(uri, "pending");
      ctx?.emit(SyncEvents.Enqueue, { uri, operation });
    },

    isOnline: () => online,
  };

  const plugin: MonacoPlugin = {
    id: "sync-module",
    name: "Sync Module",
    version: "1.0.0",
    description: "Offline-first editing with background sync",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;

      if (typeof window !== "undefined") {
        window.addEventListener("online", () => {
          online = true;
          ctx?.emit(SyncEvents.Online, {});
          api.forceSync();
        });
        window.addEventListener("offline", () => {
          online = false;
          ctx?.emit(SyncEvents.Offline, {});
        });
      }
    },

    onDispose(): void { ctx = null; },
  };

  return { plugin, api };
}

export type { SyncStatus, SyncStrategy, QueueEntry, SyncConfig, SyncModuleAPI } from "./types";
export { OfflineQueue } from "./queue";
export { resolveConflict } from "./reconciler";
export { AdapterWrapper } from "./adapter-wrapper";
export { StatusTracker } from "./status-tracker";
