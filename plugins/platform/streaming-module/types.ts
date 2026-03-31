// ── Streaming Module — Types ──────────────────────────────────

export type StreamStatus = "active" | "completed" | "aborted" | "error";

export interface StreamHandle {
  id: string;
  status: StreamStatus;
  abort: () => void;
}

export interface StreamConfig {
  onChunk: (chunk: unknown) => void;
  onDone: () => void;
  onError: (error: unknown) => void;
  bufferSize?: number;
}

export interface StreamingModuleConfig {
  defaultBufferSize?: number;
}

export interface StreamingModuleAPI {
  create(id: string, config: StreamConfig): StreamHandle;
  push(id: string, chunk: unknown): void;
  complete(id: string): void;
  abort(id: string): void;
  getActive(): StreamHandle[];
}
