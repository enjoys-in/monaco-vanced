// ── Storage Module — Plugin Entry ──────────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { StorageConfig, StorageModuleAPI, StorageDriver, StorageEntry, StorageBackend } from "./types";
import { IDBStorage } from "./idb";
import { OPFSStorage } from "./opfs";
import { SessionStorage } from "./session";

export type { StorageConfig, StorageModuleAPI, StorageDriver, StorageEntry, StorageBackend } from "./types";
export { IDBStorage } from "./idb";
export { OPFSStorage } from "./opfs";
export { SessionStorage } from "./session";

function detectBestBackend(): StorageBackend {
  if (typeof indexedDB !== "undefined") return "idb";
  if (typeof navigator !== "undefined" && "storage" in navigator && "getDirectory" in navigator.storage) return "opfs";
  return "session";
}

function createDriver(backend: StorageBackend, namespace: string): StorageDriver {
  switch (backend) {
    case "idb":
      return new IDBStorage(namespace);
    case "opfs":
      return new OPFSStorage(namespace);
    case "session":
      return new SessionStorage(namespace);
  }
}

export function createStoragePlugin(config: StorageConfig = {}): {
  plugin: MonacoPlugin;
  api: StorageModuleAPI;
} {
  const backend = config.backend ?? detectBestBackend();
  const namespace = config.namespace ?? "monaco-vanced-storage";
  const driver = createDriver(backend, namespace);
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;

  const api: StorageModuleAPI = {
    async get<T = unknown>(key: string): Promise<T | undefined> {
      const entry = await driver.get(key);
      return entry?.value as T | undefined;
    },

    async set(key: string, value: unknown, ttl?: number): Promise<void> {
      const entry: StorageEntry = {
        key,
        value,
        ttl,
        createdAt: Date.now(),
      };
      await driver.set(entry);
    },

    async remove(key: string): Promise<void> {
      await driver.remove(key);
    },

    async has(key: string): Promise<boolean> {
      return driver.has(key);
    },

    async keys(): Promise<string[]> {
      return driver.keys();
    },

    async clear(): Promise<void> {
      await driver.clear();
    },

    async getSize(): Promise<number> {
      return driver.size();
    },
  };

  const plugin: MonacoPlugin = {
    id: "infrastructure.storage",
    name: "Storage Module",
    version: "1.0.0",
    description: "Multi-backend key-value storage with TTL support",

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      disposables.push(
        ctx.on("storage:set", async (data?: unknown) => {
          const d = data as { key?: string; value?: unknown; ttl?: number } | undefined;
          if (d?.key !== undefined) {
            await api.set(d.key, d.value, d.ttl);
          }
        }),
      );

      disposables.push(
        ctx.on("storage:remove", async (data?: unknown) => {
          const d = data as { key?: string } | undefined;
          if (d?.key) await api.remove(d.key);
        }),
      );

      disposables.push(
        ctx.on("storage:clear", async () => {
          await api.clear();
        }),
      );
    },

    onDispose() {
      disposables.forEach((d) => d.dispose());
      disposables.length = 0;
      ctx = null;
    },
  };

  return { plugin, api };
}
