// ── WebSocket Transport ────────────────────────────────────
// Persistent WebSocket connection for AI streaming.

import type { AITransport, ChatResponse, AIResponseSchema, StreamEvent, TransportConfig } from "../types";

export class WebSocketTransport implements AITransport {
  private ws: WebSocket | null = null;
  private connected = false;

  constructor(
    private config: TransportConfig,
    private responseSchema: AIResponseSchema,
  ) {}

  private async connect(): Promise<WebSocket> {
    if (this.ws && this.connected) return this.ws;

    return new Promise<WebSocket>((resolve, reject) => {
      const url = this.config.baseUrl.replace(/^http/, "ws");
      const ws = new WebSocket(url);

      ws.onopen = () => {
        this.connected = true;
        this.ws = ws;
        resolve(ws);
      };

      ws.onerror = (e) => {
        this.connected = false;
        reject(new Error(`WebSocket connection failed: ${String(e)}`));
      };

      ws.onclose = () => {
        this.connected = false;
        this.ws = null;
      };
    });
  }

  async send(payload: unknown, signal?: AbortSignal): Promise<ChatResponse> {
    let content = "";
    for await (const event of this.stream(payload, signal)) {
      content += event.token;
      if (event.done) break;
    }
    return { content };
  }

  async *stream(payload: unknown, signal?: AbortSignal): AsyncIterable<StreamEvent> {
    const ws = await this.connect();
    ws.send(JSON.stringify(payload));

    const queue: StreamEvent[] = [];
    let done = false;
    let resolveWait: (() => void) | null = null;
    let rejectWait: ((err: unknown) => void) | null = null;

    const onMessage = (e: MessageEvent) => {
      try {
        const json = JSON.parse(String(e.data));
        const event = this.responseSchema.extractToken
          ? this.responseSchema.extractToken(json)
          : { token: this.responseSchema.extractContent(json), done: true };
        queue.push(event);
        if (event.done) done = true;
        resolveWait?.();
      } catch {
        queue.push({ token: "", done: true });
        done = true;
        resolveWait?.();
      }
    };

    const onError = () => {
      done = true;
      rejectWait?.(new Error("WebSocket error during stream"));
    };

    ws.addEventListener("message", onMessage);
    ws.addEventListener("error", onError);

    if (signal) {
      signal.addEventListener("abort", () => {
        done = true;
        resolveWait?.();
      }, { once: true });
    }

    try {
      while (!done || queue.length > 0) {
        if (queue.length > 0) {
          const event = queue.shift()!;
          yield event;
          if (event.done) return;
        } else {
          await new Promise<void>((resolve, reject) => {
            resolveWait = resolve;
            rejectWait = reject;
          });
        }
      }
    } finally {
      ws.removeEventListener("message", onMessage);
      ws.removeEventListener("error", onError);
    }
  }

  dispose(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
}
