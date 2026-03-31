// ── Streaming Module — Plugin Entry ───────────────────────────

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { StreamingModuleConfig, StreamingModuleAPI, StreamConfig, StreamHandle } from "./types";
import { ManagedStream } from "./stream";

export type { StreamingModuleConfig, StreamingModuleAPI, StreamConfig, StreamHandle, StreamStatus } from "./types";
export { ManagedStream } from "./stream";
export { BackpressureManager } from "./backpressure";

export function createStreamingPlugin(config: StreamingModuleConfig = {}): {
  plugin: MonacoPlugin;
  api: StreamingModuleAPI;
} {
  const streams = new Map<string, ManagedStream>();
  let ctx: PluginContext | null = null;

  const api: StreamingModuleAPI = {
    create(id: string, streamConfig: StreamConfig): StreamHandle {
      if (streams.has(id)) {
        throw new Error(`Stream "${id}" already exists`);
      }

      const effectiveConfig: StreamConfig = {
        ...streamConfig,
        bufferSize: streamConfig.bufferSize ?? config.defaultBufferSize,
      };

      const stream = new ManagedStream(id, effectiveConfig);
      streams.set(id, stream);
      ctx?.emit("stream:start", { id });

      return {
        id,
        get status() { return stream.status; },
        abort: () => api.abort(id),
      };
    },

    push(id: string, chunk: unknown): void {
      const stream = streams.get(id);
      if (!stream) throw new Error(`Stream "${id}" not found`);
      stream.push(chunk);
    },

    complete(id: string): void {
      const stream = streams.get(id);
      if (!stream) return;
      stream.complete();
      streams.delete(id);
      ctx?.emit("stream:complete", { id });
    },

    abort(id: string): void {
      const stream = streams.get(id);
      if (!stream) return;
      stream.abort();
      streams.delete(id);
    },

    getActive(): StreamHandle[] {
      return Array.from(streams.values())
        .filter((s) => s.status === "active")
        .map((s) => ({
          id: s.id,
          status: s.status,
          abort: () => api.abort(s.id),
        }));
    },
  };

  const plugin: MonacoPlugin = {
    id: "platform.streaming",
    name: "Streaming Module",
    version: "1.0.0",
    description: "Managed streams with chunk buffering and backpressure",

    onMount(_ctx: PluginContext) {
      ctx = _ctx;
    },

    onDispose() {
      for (const stream of streams.values()) stream.abort();
      streams.clear();
      ctx = null;
    },
  };

  return { plugin, api };
}
