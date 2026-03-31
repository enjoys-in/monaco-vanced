// ── Concurrency Module — Plugin Entry ─────────────────────────

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { ConcurrencyConfig, ConcurrencyModuleAPI } from "./types";
import { DedupeMap } from "./dedupe";
import { CancelPrevious } from "./cancel";
import { Semaphore } from "./semaphore";
import { AsyncMutex } from "./mutex";
import { AbortPool } from "./abort-pool";

export type { ConcurrencyConfig, ConcurrencyModuleAPI, SemaphoreConfig, MutexHandle } from "./types";
export { DedupeMap } from "./dedupe";
export { CancelPrevious } from "./cancel";
export { Semaphore } from "./semaphore";
export { AsyncMutex } from "./mutex";
export { AbortPool } from "./abort-pool";

export function createConcurrencyPlugin(_config: ConcurrencyConfig = {}): {
  plugin: MonacoPlugin;
  api: ConcurrencyModuleAPI;
} {
  const dedupeMap = new DedupeMap();
  const cancelPrevious = new CancelPrevious();
  const semaphores = new Map<string, Semaphore>();
  const mutexes = new Map<string, AsyncMutex>();
  const abortPool = new AbortPool();
  let _ctx: PluginContext | null = null; void _ctx;

  const api: ConcurrencyModuleAPI = {
    dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
      return dedupeMap.dedupe(key, fn);
    },

    cancelPrevious<T>(key: string, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
      return cancelPrevious.cancelPrevious(key, fn);
    },

    semaphore(domain: string, max: number) {
      let sem = semaphores.get(domain);
      if (!sem) {
        sem = new Semaphore(max);
        semaphores.set(domain, sem);
      }
      return {
        acquire: () => sem!.acquire(),
        release: () => sem!.release(),
      };
    },

    async mutex<T>(key: string, fn: () => Promise<T>): Promise<T> {
      let mtx = mutexes.get(key);
      if (!mtx) {
        mtx = new AsyncMutex();
        mutexes.set(key, mtx);
      }
      const release = await mtx.lock();
      try {
        return await fn();
      } finally {
        release();
      }
    },

    getAbortSignal(key: string): AbortSignal {
      return abortPool.getSignal(key);
    },
  };

  const plugin: MonacoPlugin = {
    id: "platform.concurrency",
    name: "Concurrency Module",
    version: "1.0.0",
    description: "Deduplication, cancel-previous, semaphores, mutexes, and abort signals",

    onMount(pluginCtx: PluginContext) {
      _ctx = pluginCtx;
    },

    onDispose() {
      cancelPrevious.abortAll();
      abortPool.abortAll();
      semaphores.clear();
      mutexes.clear();
      _ctx = null;
    },
  };

  return { plugin, api };
}
