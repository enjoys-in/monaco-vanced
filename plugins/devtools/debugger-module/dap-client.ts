// ── Debugger Module — DAP Client ─────────────────────────────
// WebSocket-based Debug Adapter Protocol client.

export interface DAPRequest {
  seq: number;
  type: "request";
  command: string;
  arguments?: Record<string, unknown>;
}

export interface DAPResponse {
  seq: number;
  type: "response";
  request_seq: number;
  success: boolean;
  command: string;
  body?: Record<string, unknown>;
  message?: string;
}

export interface DAPEvent {
  seq: number;
  type: "event";
  event: string;
  body?: Record<string, unknown>;
}

export type DAPMessage = DAPRequest | DAPResponse | DAPEvent;

export type DAPState = "disconnected" | "connecting" | "connected";

export class DAPClient {
  private ws: WebSocket | null = null;
  private _state: DAPState = "disconnected";
  private _seq = 1;
  private pendingRequests = new Map<number, {
    resolve: (body: Record<string, unknown> | undefined) => void;
    reject: (err: Error) => void;
  }>();
  private eventHandlers: Array<(event: DAPEvent) => void> = [];

  get state(): DAPState {
    return this._state;
  }

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this._state = "connecting";

      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this._state = "connected";
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const msg: DAPMessage = JSON.parse(event.data as string);
            this.handleMessage(msg);
          } catch {
            // Ignore malformed messages
          }
        };

        this.ws.onclose = () => {
          this._state = "disconnected";
          this.rejectAllPending("Connection closed");
          this.ws = null;
        };

        this.ws.onerror = () => {
          this._state = "disconnected";
          this.rejectAllPending("Connection error");
          this.ws = null;
          reject(new Error("DAP connection failed"));
        };
      } catch (e) {
        this._state = "disconnected";
        reject(e);
      }
    });
  }

  send(command: string, args?: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this._state !== "connected") {
        reject(new Error("Not connected to debug adapter"));
        return;
      }

      const seq = this._seq++;
      const request: DAPRequest = {
        seq,
        type: "request",
        command,
        arguments: args,
      };

      this.pendingRequests.set(seq, { resolve, reject });
      this.ws.send(JSON.stringify(request));
    });
  }

  onEvent(handler: (event: DAPEvent) => void): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const idx = this.eventHandlers.indexOf(handler);
      if (idx >= 0) this.eventHandlers.splice(idx, 1);
    };
  }

  disconnect(): void {
    this.rejectAllPending("Disconnected");
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._state = "disconnected";
    this.eventHandlers = [];
  }

  private handleMessage(msg: DAPMessage): void {
    if (msg.type === "response") {
      const pending = this.pendingRequests.get(msg.request_seq);
      if (pending) {
        this.pendingRequests.delete(msg.request_seq);
        if (msg.success) {
          pending.resolve(msg.body);
        } else {
          pending.reject(new Error(msg.message ?? "DAP request failed"));
        }
      }
    } else if (msg.type === "event") {
      for (const handler of this.eventHandlers) {
        handler(msg as DAPEvent);
      }
    }
  }

  private rejectAllPending(reason: string): void {
    for (const [, pending] of this.pendingRequests) {
      pending.reject(new Error(reason));
    }
    this.pendingRequests.clear();
  }
}
