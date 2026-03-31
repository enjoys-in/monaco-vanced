// ── Virtualization plugin — virtual scroll for large lists ──
import type { MonacoPlugin, PluginContext } from "@core/types";
import type { VirtualListConfig, VirtualHandle } from "./types";
import { createVirtualList } from "./virtual-list";
import { VirtualizeEvents } from "@core/events";

export function createVirtualizationPlugin(): MonacoPlugin {
  const lists = new Map<string, VirtualHandle>();

  return {
    id: "virtualization-module",
    name: "Virtualization Module",
    version: "1.0.0",
    description: "DOM virtualization for large lists — file trees, search results, logs",
    priority: 20,
    defaultEnabled: true,

    onMount(ctx: PluginContext) {
      // Listen for virtualize:create-list events from other plugins
      ctx.on(VirtualizeEvents.CreateList, (payload) => {
        const config = payload as VirtualListConfig;
        const id = config.id ?? `vlist-${Date.now()}`;
        const handle = createVirtualList({ ...config, id });
        lists.set(id, handle);
        ctx.emit(VirtualizeEvents.Mount, { listId: id, itemCount: config.itemCount });
      });
    },

    onDispose() {
      for (const handle of lists.values()) handle.dispose();
      lists.clear();
    },
  };
}

export { createVirtualList } from "./virtual-list";
export { VariableHeightCache } from "./variable-height";
export { KeyboardNavigator } from "./keyboard";
export type { VirtualListConfig, VirtualHandle, VirtualScrollState } from "./types";
