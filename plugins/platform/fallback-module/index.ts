// ── Fallback Module — Plugin Entry ────────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { FallbackConfig, FallbackModuleAPI, FallbackProvider, ProviderHealth } from "./types";
import { FallbackRegistry } from "./registry";
import { HealthChecker } from "./health";
import { FailoverManager } from "./failover";

export type { FallbackConfig, FallbackModuleAPI, FallbackChain, FallbackProvider, ProviderHealth } from "./types";
export { FallbackRegistry } from "./registry";
export { HealthChecker } from "./health";
export { FailoverManager } from "./failover";

export function createFallbackPlugin(config: FallbackConfig = {}): {
  plugin: MonacoPlugin;
  api: FallbackModuleAPI;
} {
  const registry = new FallbackRegistry();
  const healthChecker = new HealthChecker();
  const failoverManager = new FailoverManager(registry, healthChecker);
  const failoverHandlers: Array<(data?: unknown) => void> = [];
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;

  const api: FallbackModuleAPI = {
    register(domain: string, providers: FallbackProvider[]): void {
      registry.register(domain, providers);
      healthChecker.setProviders(providers);
    },

    get(domain: string): FallbackProvider | null {
      const providers = registry.getProviders(domain);
      if (providers.length === 0) return null;

      const forced = registry.getForcedProvider(domain);
      if (forced) {
        return providers.find((p) => p.id === forced) ?? providers[0];
      }

      // Return first healthy provider
      for (const p of providers) {
        const health = healthChecker.getHealth(p.id);
        if (!health || health.healthy) return p;
      }
      return providers[0];
    },

    getHealth(domain: string): ProviderHealth[] {
      const providers = registry.getProviders(domain);
      return providers
        .map((p) => healthChecker.getHealth(p.id))
        .filter((h): h is ProviderHealth => h !== undefined);
    },

    forceProvider(domain: string, id: string): void {
      registry.forceProvider(domain, id);
    },

    onFailover(handler: (data?: unknown) => void): IDisposable {
      failoverHandlers.push(handler);
      const remove = failoverManager.onFailover((data) => {
        ctx?.emit("fallback:failover", data);
        handler(data);
      });
      return {
        dispose() {
          remove();
          const idx = failoverHandlers.indexOf(handler);
          if (idx !== -1) failoverHandlers.splice(idx, 1);
        },
      };
    },
  };

  const plugin: MonacoPlugin = {
    id: "platform.fallback",
    name: "Fallback Module",
    version: "1.0.0",
    description: "Provider fallback chains with health checking and automatic failover",

    onMount(_ctx: PluginContext) {
      ctx = _ctx;
      if (config.healthCheckInterval) {
        healthChecker.startMonitoring(config.healthCheckInterval);
      }
    },

    onDispose() {
      healthChecker.stopMonitoring();
      disposables.forEach((d) => d.dispose());
      failoverHandlers.length = 0;
      ctx = null;
    },
  };

  return { plugin, api };
}
