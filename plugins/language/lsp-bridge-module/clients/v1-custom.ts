// ── LSP Bridge Module — Version 1: Custom WebSocket JSON-RPC Client ──
// See context/lsp-bridge-module.txt Section 5

import type { EventBus } from "@core/event-bus";
import type { IDisposable } from "@core/types";
import type {
  LspConnectionConfig,
  LspConnectionState,
  LspClient,
  PendingRequest,
  JsonRpcResponse,
  JsonRpcNotification,
} from "../types";
import { LspConnectionManager } from "../connection";
import { LspEvents } from "@core/events";

/**
 * V1 Custom LSP Client — direct WebSocket + manual JSON-RPC 2.0 framing.
 * No LSP initialize handshake — sends RPC requests immediately on connect.
 */
export class CustomLspClient implements LspClient {
  private ws: WebSocket | null = null;
  private manager: LspConnectionManager;
  private pendingRequests = new Map<number, PendingRequest>();
  private notificationHandlers = new Map<string, Set<(params: unknown) => void>>();
  private nextRequestId = 1;

  constructor(
    private eventBus: EventBus,
    private config: LspConnectionConfig,
  ) {
    this.manager = new LspConnectionManager(eventBus, config);
  }

  // ── Connect ───────────────────────────────────────────────

  async connect(): Promise<void> {
    this.manager.transition("connecting");

    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.config.url);
      this.ws = ws;

      ws.onopen = () => {
        this.manager.transition("connected");
        this.manager.resetRetries();

        if (this.manager.markFirstConnect()) {
          this.eventBus.emit(LspEvents.Connected, { mode: "custom", firstConnect: true });
        }

        this.manager.startPing(() => {
          this.handleDisconnect();
        });

        resolve();
      };

      ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data as string);
      };

      ws.onerror = () => {
        reject(new Error("WebSocket connection error"));
      };

      ws.onclose = () => {
        this.manager.stopPing();
        this.handleDisconnect();
      };
    });
  }

  private handleDisconnect(): void {
    if (this.manager.getState() === "disconnected" || this.manager.getState() === "failed") {
      return;
    }
    this.manager.scheduleRetry(() => this.connect());
  }

  // ── Disconnect ────────────────────────────────────────────

  disconnect(): void {
    this.manager.cancelRetry();
    this.manager.stopPing();

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Client disconnected"));
      this.pendingRequests.delete(id);
    }

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }

    this.manager.transition("disconnected");
  }

  // ── RPC Methods ───────────────────────────────────────────

  async request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Not connected");
    }

    const id = this.nextRequestId++;
    const message = JSON.stringify({
      jsonrpc: "2.0" as const,
      id,
      method,
      params,
    });

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        this.eventBus.emit(LspEvents.RequestTimeout, { id, method });
        reject(new Error(`Request timeout: ${method} (id=${id})`));
      }, this.config.timeoutMs);

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        method,
        timer,
      });

      this.ws!.send(message);
      this.eventBus.emit(LspEvents.RequestSent, { id, method });
    });
  }

  notify(method: string, params?: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = JSON.stringify({
      jsonrpc: "2.0" as const,
      method,
      params,
    });

    this.ws.send(message);
  }

  onNotification(method: string, handler: (params: unknown) => void): IDisposable {
    if (!this.notificationHandlers.has(method)) {
      this.notificationHandlers.set(method, new Set());
    }
    this.notificationHandlers.get(method)!.add(handler);

    return {
      dispose: () => {
        this.notificationHandlers.get(method)?.delete(handler);
        if (this.notificationHandlers.get(method)?.size === 0) {
          this.notificationHandlers.delete(method);
        }
      },
    };
  }

  // ── Message handling ──────────────────────────────────────

  private handleMessage(raw: string): void {
    let msg: JsonRpcResponse | JsonRpcNotification;
    try {
      msg = JSON.parse(raw) as JsonRpcResponse | JsonRpcNotification;
    } catch {
      return;
    }

    // Response to a request
    if ("id" in msg && typeof msg.id === "number") {
      const response = msg as JsonRpcResponse;
      const pending = this.pendingRequests.get(response.id);
      if (!pending) return;

      clearTimeout(pending.timer);
      this.pendingRequests.delete(response.id);

      this.eventBus.emit(LspEvents.ResponseReceived, {
        id: response.id,
        method: pending.method,
      });

      if (response.error) {
        pending.reject(
          new Error(`${response.error.message} (code: ${response.error.code})`),
        );
      } else {
        pending.resolve(response.result);
      }
      return;
    }

    // Server-sent notification
    if ("method" in msg) {
      const notification = msg as JsonRpcNotification;
      const handlers = this.notificationHandlers.get(notification.method);
      if (handlers) {
        for (const handler of handlers) {
          handler(notification.params);
        }
      }
    }
  }

  // ── State ─────────────────────────────────────────────────

  getState(): LspConnectionState {
    return this.manager.getState();
  }

  isConnected(): boolean {
    return this.manager.isConnected();
  }

  retry(): void {
    this.manager.resetRetries();
    this.connect().catch(() => {});
  }

  dispose(): void {
    this.disconnect();
    this.notificationHandlers.clear();
    this.manager.dispose();
  }
}
