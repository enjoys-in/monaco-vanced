// ── Resource Module — Plugin Entry ────────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { ResourceConfig, ResourceModuleAPI, LeakReport } from "./types";
import { ResourceRegistry } from "./registry";
import { LeakScanner } from "./leak-scan";
import { DisposeGroupManager } from "./groups";
import { GCStrategy } from "./gc-strategy";
import { ResourceEvents } from "@core/events";

export type { ResourceConfig, ResourceModuleAPI, ResourceEntry, LeakReport, DisposeGroup } from "./types";
export { ResourceRegistry } from "./registry";
export { LeakScanner } from "./leak-scan";
export { DisposeGroupManager } from "./groups";
export { GCStrategy } from "./gc-strategy";

export function createResourcePlugin(config: ResourceConfig = {}): {
  plugin: MonacoPlugin;
  api: ResourceModuleAPI;
} {
  const registry = new ResourceRegistry();
  const leakScanner = new LeakScanner(registry, config.graceMs);
  const groupManager = new DisposeGroupManager(registry);
  const gcStrategy = new GCStrategy(registry);
  const leakHandlers: Array<(data?: unknown) => void> = [];
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;

  const api: ResourceModuleAPI = {
    register(type: string, key: string, disposable: IDisposable, opts?: { owner?: string; group?: string }): void {
      registry.register(type, key, disposable, opts);
      if (opts?.group) {
        groupManager.addToGroup(opts.group, key);
      }
      ctx?.emit(ResourceEvents.Register, { type, key, owner: opts?.owner });
    },

    dispose(key: string): void {
      const entry = registry.get(key);
      if (entry) {
        registry.dispose(key);
        ctx?.emit(ResourceEvents.Dispose, { key, type: entry.type });
      }
    },

    disposeGroup(groupId: string): void {
      const disposed = groupManager.disposeGroup(groupId);
      if (disposed.length > 0) {
        ctx?.emit(ResourceEvents.Dispose, { groupId, count: disposed.length });
      }
    },

    getLeaks(): LeakReport[] {
      return leakScanner.scan();
    },

    onLeak(handler: (data?: unknown) => void): IDisposable {
      leakHandlers.push(handler);
      const remove = leakScanner.onLeak((reports) => {
        ctx?.emit(ResourceEvents.Leak, { count: reports.length, reports });
        handler({ count: reports.length, reports });
      });
      return {
        dispose() {
          remove();
          const idx = leakHandlers.indexOf(handler);
          if (idx !== -1) leakHandlers.splice(idx, 1);
        },
      };
    },

    addRef(key: string): void {
      registry.addRef(key);
    },

    releaseRef(key: string): void {
      const disposed = registry.releaseRef(key);
      if (disposed) {
        ctx?.emit(ResourceEvents.Dispose, { key, reason: "ref-count-zero" });
      }
    },
  };

  const plugin: MonacoPlugin = {
    id: "platform.resource",
    name: "Resource Module",
    version: "1.0.0",
    description: "Resource lifecycle management with leak detection, groups, and GC strategies",

    onMount(_ctx: PluginContext) {
      ctx = _ctx;

      if (config.leakScanInterval) {
        leakScanner.startScanning(config.leakScanInterval);
      }

      gcStrategy.startIdleCollection();
    },

    onDispose() {
      leakScanner.stopScanning();
      gcStrategy.stopIdleCollection();
      registry.disposeAll();
      disposables.forEach((d) => d.dispose());
      leakHandlers.length = 0;
      ctx = null;
    },
  };

  return { plugin, api };
}
