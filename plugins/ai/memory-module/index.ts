// ── Memory Module ──────────────────────────────────────────
// Persistent AI context across sessions: conventions,
// frequently edited files, project summary, task state.

import type { MonacoPlugin, PluginContext } from "@core/types";
import { MemoryEvents } from "@core/events";
import type { MemoryModuleAPI, MemoryPluginOptions } from "./types";
import { ContextStore } from "./context-store";
import { injectMemory } from "./injector";

export function createMemoryPlugin(
  options: MemoryPluginOptions = {},
): { plugin: MonacoPlugin; api: MemoryModuleAPI } {
  const store = new ContextStore(options.maxEntries, options.persistKey);
  let ctx: PluginContext | null = null;

  const api: MemoryModuleAPI = {
    store(key, value, category) {
      const entry = store.store(key, value, category, ctx?.pluginId);
      ctx?.emit(MemoryEvents.Update, { key, value, category: entry.category });
    },
    get: (key) => store.get(key),
    getByCategory: (cat) => store.getByCategory(cat),
    getAll: () => store.getAll(),
    remove(key) {
      store.remove(key);
      ctx?.emit(MemoryEvents.Update, { key, removed: true });
    },
    clear() {
      store.clear();
      ctx?.emit(MemoryEvents.Clear, {});
    },
    inject: () => injectMemory(store.getAll()),
  };

  const plugin: MonacoPlugin = {
    id: "memory-module",
    name: "Memory Module",
    version: "1.0.0",
    description: "Persistent AI context across sessions",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;
    },

    onDispose(): void {
      store.dispose();
      ctx = null;
    },
  };

  return { plugin, api };
}

export type { MemoryEntry, MemoryModuleAPI, MemoryPluginOptions } from "./types";
export { ContextStore } from "./context-store";
export { injectMemory } from "./injector";
