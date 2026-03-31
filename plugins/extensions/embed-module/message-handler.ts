// ── Embed Module — MessageBridge ─────────────────────────────

import type { EmbedMessage } from "./types";

const CHANNEL = "monaco-vanced-embed";

export class MessageBridge {
  private handlers: Array<(msg: EmbedMessage) => void> = [];
  private allowedOrigins: Set<string>;
  private listener: ((e: MessageEvent) => void) | null = null;

  constructor(allowedOrigins: string[] = ["*"]) {
    this.allowedOrigins = new Set(allowedOrigins);
  }

  /** Start listening for postMessage events */
  start(): void {
    if (this.listener) return;
    this.listener = (e: MessageEvent) => {
      if (!this.isOriginAllowed(e.origin)) return;
      const data = this.deserialize(e.data);
      if (!data || data.channel !== CHANNEL) return;
      const msg: EmbedMessage = {
        type: data.type,
        payload: data.payload,
        source: data.source ?? e.origin,
      };
      for (const handler of this.handlers) {
        try {
          handler(msg);
        } catch (err) {
          console.warn("[embed] message handler error:", err);
        }
      }
    };
    window.addEventListener("message", this.listener);
  }

  /** Stop listening */
  stop(): void {
    if (this.listener) {
      window.removeEventListener("message", this.listener);
      this.listener = null;
    }
    this.handlers = [];
  }

  /** Post a message to a target window */
  postMessage(target: Window, msg: EmbedMessage, targetOrigin = "*"): void {
    const serialized = this.serialize(msg);
    target.postMessage(serialized, targetOrigin);
  }

  /** Register a message handler */
  onMessage(handler: (msg: EmbedMessage) => void): void {
    this.handlers.push(handler);
  }

  private isOriginAllowed(origin: string): boolean {
    return this.allowedOrigins.has("*") || this.allowedOrigins.has(origin);
  }

  private serialize(msg: EmbedMessage): string {
    return JSON.stringify({
      channel: CHANNEL,
      type: msg.type,
      payload: msg.payload,
      source: msg.source,
    });
  }

  private deserialize(data: unknown): { channel: string; type: string; payload: unknown; source?: string } | null {
    if (typeof data !== "string") return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
}
