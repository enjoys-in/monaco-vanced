// ── Context Fusion Module ──────────────────────────────────
// Multi-source context assembly with token budget strategies.

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { ContextFusionAPI, FusionConfig } from "./types";
import { SourceRegistry } from "./sources";
import { StrategyRegistry } from "./strategies";
import { Gatherer } from "./gatherer";

export function createContextFusionPlugin(
  config: FusionConfig = {},
): { plugin: MonacoPlugin; api: ContextFusionAPI } {
  const sourceRegistry = new SourceRegistry();
  const strategyRegistry = new StrategyRegistry();
  const gatherer = new Gatherer(sourceRegistry, config.defaultBudget ?? 4000);
  let ctx: PluginContext | null = null;

  const api: ContextFusionAPI = {
    registerSource: (source) => sourceRegistry.register(source),
    removeSource: (id) => sourceRegistry.remove(id),
    registerStrategy: (strategy) => strategyRegistry.register(strategy),

    async gather(strategyId = "chat") {
      const strategy = strategyRegistry.get(strategyId);
      if (!strategy) throw new Error(`Unknown strategy: ${strategyId}`);

      ctx?.emit("fusion:gather-start", { strategyId });
      const result = await gatherer.gather(strategy);

      if (result.truncated) {
        ctx?.emit("fusion:token-overflow", { strategyId, tokenCount: result.tokenCount });
      }

      ctx?.emit("fusion:gather-complete", {
        strategyId,
        sourcesUsed: result.sourcesUsed,
        tokenCount: result.tokenCount,
        truncated: result.truncated,
      });

      return result;
    },

    getSources: () => sourceRegistry.getAll(),
    getStrategies: () => strategyRegistry.getAll(),
  };

  const plugin: MonacoPlugin = {
    id: "context-fusion-module",
    name: "Context Fusion Module",
    version: "1.0.0",
    description: "Multi-source context assembly with token budget",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;
    },

    onDispose(): void {
      ctx = null;
    },
  };

  return { plugin, api };
}

export type { FusionSource, FusionStrategy, FusionResult, FusionConfig, ContextFusionAPI } from "./types";
export { SourceRegistry } from "./sources";
export { StrategyRegistry, STRATEGIES } from "./strategies";
export { Gatherer } from "./gatherer";
export { estimateTokens, fitBudget } from "./token-budget";
