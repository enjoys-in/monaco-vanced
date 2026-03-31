// ── Realtime Transport (WebSocket) ─────────────────────────

export type MessageHandler = (data: unknown) => void;

export interface TransportConfig {
  url: string;
  reconnect?: boolean;
  heartbeatMs?: number;
  maxReconnectAttempts?: number;
}

export class RealtimeTransport {
  private ws: WebSocket | null = null;
  private readonly handlers: Set<MessageHandler> = new Set();
  private readonly config: Required<TransportConfig>;
  private reconnectAttempts = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(config: TransportConfig) {
    this.config = {
      url: config.url,
      reconnect: config.reconnect ?? true,
      heartbeatMs: config.heartbeatMs ?? 30000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
    };
  }

  connect(): void {
    if (this.disposed) return;

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          for (const handler of this.handlers) {
            handler(data);
          }
        } catch {
          // Non-JSON message, ignore
        }
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        if (this.config.reconnect && !this.disposed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        // Error handled by onclose
      };
    } catch {
      if (this.config.reconnect && !this.disposed) {
        this.scheduleReconnect();
      }
    }
  }

  disconnect(): void {
    this.disposed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(msg: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: "ping", timestamp: Date.now() });
    }, this.config.heartbeatMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error("[Realtime] Max reconnect attempts reached");
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }
}
