// ── Terminal Module — PTY Client ──────────────────────────────
// WebSocket-based PTY connection for terminal sessions.

import type { TerminalConfig } from "./types";

export type PtyState = "disconnected" | "connecting" | "connected";

export class PtyClient {
  private ws: WebSocket | null = null;
  private _state: PtyState = "disconnected";
  private dataHandlers: Array<(data: string) => void> = [];
  private sessionId: string | null = null;

  get state(): PtyState {
    return this._state;
  }

  connect(sessionId: string, config: TerminalConfig): WebSocket | null {
    if (this.ws && this._state === "connected") {
      this.disconnect();
    }

    this.sessionId = sessionId;
    this._state = "connecting";

    const shell = config.defaultShell ?? "/bin/sh";
    const url = `ws://localhost:3100/pty?session=${encodeURIComponent(sessionId)}&shell=${encodeURIComponent(shell)}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this._state = "connected";
      };

      this.ws.onmessage = (event) => {
        const data = typeof event.data === "string" ? event.data : "";
        for (const handler of this.dataHandlers) {
          handler(data);
        }
      };

      this.ws.onclose = () => {
        this._state = "disconnected";
        this.ws = null;
      };

      this.ws.onerror = () => {
        this._state = "disconnected";
        this.ws = null;
      };

      return this.ws;
    } catch {
      this._state = "disconnected";
      return null;
    }
  }

  write(data: string): void {
    if (this.ws && this._state === "connected") {
      this.ws.send(data);
    }
  }

  onData(handler: (data: string) => void): () => void {
    this.dataHandlers.push(handler);
    return () => {
      const idx = this.dataHandlers.indexOf(handler);
      if (idx >= 0) this.dataHandlers.splice(idx, 1);
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._state = "disconnected";
    this.sessionId = null;
    this.dataHandlers = [];
  }

  getSessionId(): string | null {
    return this.sessionId;
  }
}
