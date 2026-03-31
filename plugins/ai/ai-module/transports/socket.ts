// ── Socket.IO Transport ────────────────────────────────────
// Raw socket / Socket.IO-style transport for AI.

import type { AITransport, ChatResponse, AIResponseSchema, StreamEvent, TransportConfig } from "../types";

export class SocketTransport implements AITransport {
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
        reject(new Error(`Socket connection failed: ${String(e)}`));
      };

      ws.onclose = () => {
        this.connected = false;
        this.ws = null;
      };
    });
  }

  /**
   * Socket.IO-style: emit an event with a payload.
   * Wraps the payload in a Socket.IO-like envelope: ["event", payload]
   */
  private encodeMessage(event: string, payload: unknown): string {
    return JSON.stringify([event, payload]);
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
    ws.send(this.encodeMessage("ai:chat", payload));

    const queue: StreamEvent[] = [];
    let done = false;
    let resolveWait: (() => void) | null = null;

    const onMessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(String(e.data));
        // Socket.IO-style: ["event", data]
        if (Array.isArray(data)) {
          const [_eventName, eventData] = data;
          const event = this.responseSchema.extractToken
            ? this.responseSchema.extractToken(eventData)
            : { token: this.responseSchema.extractContent(eventData), done: true };
          queue.push(event);
          if (event.done) done = true;
        } else {
          const event = this.responseSchema.extractToken
            ? this.responseSchema.extractToken(data)
            : { token: this.responseSchema.extractContent(data), done: true };
          queue.push(event);
          if (event.done) done = true;
        }
        resolveWait?.();
      } catch {
        queue.push({ token: "", done: true });
        done = true;
        resolveWait?.();
      }
    };

    ws.addEventListener("message", onMessage);

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
          await new Promise<void>((resolve) => {
            resolveWait = resolve;
          });
        }
      }
    } finally {
      ws.removeEventListener("message", onMessage);
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
