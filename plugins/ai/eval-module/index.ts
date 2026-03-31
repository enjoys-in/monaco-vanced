// ── Eval Module ────────────────────────────────────────────
// Tracks AI suggestion quality via accept/reject feedback.

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { EvalConfig, EvalModuleAPI } from "./types";
import { EvalTracker } from "./tracker";
import { AiEvents, EvalEvents } from "@core/events";

export function createEvalPlugin(
  config: EvalConfig = {},
): { plugin: MonacoPlugin; api: EvalModuleAPI } {
  const tracker = new EvalTracker(config.historySize);
  let ctx: PluginContext | null = null;

  const api: EvalModuleAPI = {
    score(requestId, metrics) {
      const entry = tracker.score(requestId, metrics);
      ctx?.emit(EvalEvents.Score, { entry });
      return entry;
    },
    accept(requestId) {
      tracker.accept(requestId);
      ctx?.emit(AiEvents.Accept, { requestId });
    },
    reject(requestId) {
      tracker.reject(requestId);
      ctx?.emit(AiEvents.Reject, { requestId });
    },
    getAcceptRate: () => tracker.getAcceptRate(),
    getHistory: () => tracker.getHistory(),
    clear: () => tracker.clear(),
  };

  const plugin: MonacoPlugin = {
    id: "eval-module",
    name: "Eval Module",
    version: "1.0.0",
    description: "AI suggestion quality tracking",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;

      if (config.autoTrack !== false) {
        ctx.on(AiEvents.Accept, (data?: unknown) => {
          const requestId = (data as Record<string, unknown>)?.requestId as string;
          if (requestId) tracker.accept(requestId);
        });

        ctx.on(AiEvents.Reject, (data?: unknown) => {
          const requestId = (data as Record<string, unknown>)?.requestId as string;
          if (requestId) tracker.reject(requestId);
        });
      }
    },

    onDispose(): void {
      ctx = null;
    },
  };

  return { plugin, api };
}

export type { EvalScore, EvalConfig, EvalModuleAPI } from "./types";
export { EvalTracker } from "./tracker";
export { computeScore } from "./scorer";
