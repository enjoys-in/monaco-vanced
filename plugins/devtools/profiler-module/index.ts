// ── Profiler Module — Plugin Entry ───────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { FlameNode, MemorySnapshot, ProfilerConfig, ProfilerModuleAPI } from "./types";
import { FlameGraphBuilder } from "./flame-graph";
import { MemoryTracker } from "./memory-tracker";

export type { FlameNode, MemorySnapshot, ProfilerConfig, ProfilerModuleAPI } from "./types";
export { FlameGraphBuilder } from "./flame-graph";
export { MemoryTracker } from "./memory-tracker";

// ── Factory ──────────────────────────────────────────────────

export function createProfilerPlugin(config: ProfilerConfig = {}): {
  plugin: MonacoPlugin;
  api: ProfilerModuleAPI;
} {
  const builder = new FlameGraphBuilder();
  const memTracker = new MemoryTracker();
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;
  let profilingTimer: ReturnType<typeof setInterval> | null = null;
  let isProfiling = false;
  let lastGraph: FlameNode | null = null;

  const sampleInterval = config.sampleInterval ?? 100;
  const maxDuration = config.maxDuration ?? 60_000;

  // ── API ──────────────────────────────────────────────────

  const api: ProfilerModuleAPI = {
    startProfiling(): void {
      if (isProfiling) return;
      isProfiling = true;
      builder.reset();

      const startTime = Date.now();

      profilingTimer = setInterval(() => {
        // Auto-stop after max duration
        if (Date.now() - startTime > maxDuration) {
          api.stopProfiling();
          return;
        }

        // Take memory snapshot alongside profiling
        memTracker.snapshot();

        // In a real implementation, we'd read from the JS profiler API.
        // The builder.addSample() would be called with actual stack traces.
      }, sampleInterval);

      ctx?.emit("profiler:start", { sampleInterval, maxDuration });
    },

    stopProfiling(): FlameNode | null {
      if (!isProfiling) return lastGraph;
      isProfiling = false;

      if (profilingTimer) {
        clearInterval(profilingTimer);
        profilingTimer = null;
      }

      lastGraph = builder.build();
      ctx?.emit("profiler:stop", { samples: builder.samples });
      return lastGraph;
    },

    getFlameGraph(): FlameNode | null {
      return lastGraph;
    },

    takeMemorySnapshot(): MemorySnapshot {
      const snap = memTracker.snapshot();
      ctx?.emit("profiler:memory", { snapshot: snap });
      return snap;
    },

    getMemoryHistory(): MemorySnapshot[] {
      return memTracker.getHistory();
    },

    clear(): void {
      if (isProfiling) api.stopProfiling();
      builder.reset();
      memTracker.clear();
      lastGraph = null;
    },
  };

  // ── Plugin ─────────────────────────────────────────────────

  const plugin: MonacoPlugin = {
    id: "profiler-module",
    name: "Profiler",
    version: "1.0.0",
    description: "CPU profiling with flame graphs and memory tracking",

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      disposables.push(
        ctx.on("profiler:start", () => {
          api.startProfiling();
        }),
      );

      disposables.push(
        ctx.on("profiler:stop", () => {
          api.stopProfiling();
        }),
      );
    },

    onDispose() {
      api.clear();
      for (const d of disposables) d.dispose();
      disposables.length = 0;
      ctx = null;
    },
  };

  return { plugin, api };
}
