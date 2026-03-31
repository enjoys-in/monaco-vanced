// ── Feature Flags Module — Plugin Entry ───────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { FeatureFlagConfig, FeatureFlagModuleAPI, FlagConfig, FlagValue } from "./types";
import { FlagRegistry } from "./registry";
import { RemoteFlagSync } from "./remote";
import { CapabilityDetector } from "./capabilities";
import { BrowserDetector } from "./browser";
import { FeatureFlagEvents } from "@core/events";

export type { FeatureFlagConfig, FeatureFlagModuleAPI, FlagConfig, FlagValue } from "./types";
export { FlagRegistry } from "./registry";
export { RemoteFlagSync } from "./remote";
export { CapabilityDetector, type CapabilityReport } from "./capabilities";
export { BrowserDetector, type BrowserInfo } from "./browser";

export function createFeatureFlagPlugin(config: FeatureFlagConfig = {}): {
  plugin: MonacoPlugin;
  api: FeatureFlagModuleAPI;
} {
  const registry = new FlagRegistry();
  const remoteSync = new RemoteFlagSync(config.remoteUrl);
  const capabilityDetector = new CapabilityDetector();
  const _browserDetector = new BrowserDetector(); void _browserDetector;
  const changeHandlers: Array<(data?: unknown) => void> = [];
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;

  function notifyChange(data?: unknown): void {
    ctx?.emit(FeatureFlagEvents.Change, data);
    changeHandlers.forEach((h) => {
      try { h(data); } catch {}
    });
  }

  const api: FeatureFlagModuleAPI = {
    isEnabled(key: string): boolean {
      return registry.evaluate(key);
    },

    getValue(key: string): FlagValue | undefined {
      return registry.get(key);
    },

    setOverride(key: string, value: FlagValue): void {
      registry.setOverride(key, value);
      notifyChange({ key, value, action: "override" });
    },

    removeOverride(key: string): void {
      registry.removeOverride(key);
      notifyChange({ key, action: "remove-override" });
    },

    getAll(): Map<string, FlagValue> {
      return registry.getAll();
    },

    async sync(): Promise<void> {
      try {
        const flags = await remoteSync.fetch();
        registry.setRemoteValues(flags);
        ctx?.emit(FeatureFlagEvents.Sync, { count: flags.size });
        notifyChange({ action: "sync", count: flags.size });
      } catch (err) {
        console.warn("[feature-flags] Sync failed:", err);
      }
    },

    register(flagConfig: FlagConfig): void {
      registry.register(flagConfig);
    },

    onChange(handler: (data?: unknown) => void): IDisposable {
      changeHandlers.push(handler);
      return {
        dispose() {
          const idx = changeHandlers.indexOf(handler);
          if (idx !== -1) changeHandlers.splice(idx, 1);
        },
      };
    },
  };

  const plugin: MonacoPlugin = {
    id: "platform.feature-flags",
    name: "Feature Flags Module",
    version: "1.0.0",
    description: "Feature flags with remote sync, capability detection, and browser detection",

    onMount(_ctx: PluginContext) {
      ctx = _ctx;

      // Auto-register capability flags
      const caps = capabilityDetector.toFlags();
      for (const [key, value] of caps) {
        registry.register({ key, defaultValue: value, source: "capability" });
      }

      // Start remote sync if configured
      if (config.remoteUrl && config.refreshInterval) {
        remoteSync.startPeriodicRefresh(config.refreshInterval, (flags) => {
          registry.setRemoteValues(flags);
          notifyChange({ action: "sync", count: flags.size });
        });
      }
    },

    onDispose() {
      remoteSync.stopPeriodicRefresh();
      disposables.forEach((d) => d.dispose());
      changeHandlers.length = 0;
      ctx = null;
    },
  };

  return { plugin, api };
}
