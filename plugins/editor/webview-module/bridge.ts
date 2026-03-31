// ── Message Bridge ──────────────────────────────────────────
// Structured postMessage protocol between host and webview
// iframe. All cross-boundary calls go through typed messages.

import type { IDisposable } from "@core/types";
import type { WebviewMessage } from "./types";

/** Message envelope wrapping all host ↔ iframe communication */
export interface BridgeEnvelope {
  readonly channel: "monaco-webview";
  readonly panelId: string;
  readonly direction: "host-to-webview" | "webview-to-host";
  readonly payload: WebviewMessage;
}

/** RPC request from iframe → host */
export interface RPCRequest {
  readonly channel: "monaco-webview-rpc";
  readonly panelId: string;
  readonly requestId: string;
  readonly method: string;
  readonly args: unknown[];
}

/** RPC response from host → iframe */
export interface RPCResponse {
  readonly channel: "monaco-webview-rpc-response";
  readonly panelId: string;
  readonly requestId: string;
  readonly result?: unknown;
  readonly error?: string;
}

/** Validates that a MessageEvent is a legit bridge envelope */
export function isBridgeEnvelope(data: unknown): data is BridgeEnvelope {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return d.channel === "monaco-webview" && typeof d.panelId === "string";
}

/** Validates that a MessageEvent is an RPC request */
export function isRPCRequest(data: unknown): data is RPCRequest {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return d.channel === "monaco-webview-rpc" && typeof d.method === "string";
}

/** Validates that a MessageEvent is an RPC response */
export function isRPCResponse(data: unknown): data is RPCResponse {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return d.channel === "monaco-webview-rpc-response" && typeof d.requestId === "string";
}

/**
 * Host-side bridge: listens for messages from a specific iframe,
 * routes them to the panel's message handlers.
 */
export class HostBridge {
  private readonly _panelId: string;
  private readonly _handlers = new Set<(msg: WebviewMessage) => void>();
  private readonly _rpcHandlers = new Map<
    string,
    (args: unknown[]) => Promise<unknown>
  >();
  private _iframe: HTMLIFrameElement | null = null;
  private _listener: ((event: MessageEvent) => void) | null = null;

  constructor(panelId: string) {
    this._panelId = panelId;
  }

  /** Connect to an iframe element */
  attach(iframe: HTMLIFrameElement): void {
    this._iframe = iframe;

    this._listener = (event: MessageEvent) => {
      const data = event.data;

      // Handle regular messages
      if (isBridgeEnvelope(data) && data.panelId === this._panelId && data.direction === "webview-to-host") {
        for (const handler of this._handlers) {
          handler(data.payload);
        }
      }

      // Handle RPC requests
      if (isRPCRequest(data) && data.panelId === this._panelId) {
        void this._handleRPC(data);
      }
    };

    globalThis.addEventListener("message", this._listener);
  }

  /** Detach from the iframe and remove listener */
  detach(): void {
    if (this._listener) {
      globalThis.removeEventListener("message", this._listener);
      this._listener = null;
    }
    this._iframe = null;
  }

  /** Send a message from host → iframe */
  postToWebview(msg: WebviewMessage): void {
    if (!this._iframe?.contentWindow) return;
    const envelope: BridgeEnvelope = {
      channel: "monaco-webview",
      panelId: this._panelId,
      direction: "host-to-webview",
      payload: msg,
    };
    this._iframe.contentWindow.postMessage(envelope, "*");
  }

  /** Listen for messages from the iframe */
  onMessage(handler: (msg: WebviewMessage) => void): IDisposable {
    this._handlers.add(handler);
    return { dispose: () => this._handlers.delete(handler) };
  }

  /** Register an RPC method that the iframe can call */
  registerRPC(method: string, handler: (args: unknown[]) => Promise<unknown>): void {
    this._rpcHandlers.set(method, handler);
  }

  /** Handle RPC request from iframe */
  private async _handleRPC(request: RPCRequest): Promise<void> {
    const handler = this._rpcHandlers.get(request.method);
    const response: RPCResponse = handler
      ? await handler(request.args)
          .then((result) => ({
            channel: "monaco-webview-rpc-response" as const,
            panelId: this._panelId,
            requestId: request.requestId,
            result,
          }))
          .catch((err: Error) => ({
            channel: "monaco-webview-rpc-response" as const,
            panelId: this._panelId,
            requestId: request.requestId,
            error: err.message,
          }))
      : {
          channel: "monaco-webview-rpc-response" as const,
          panelId: this._panelId,
          requestId: request.requestId,
          error: `Unknown RPC method: ${request.method}`,
        };

    this._iframe?.contentWindow?.postMessage(response, "*");
  }

  dispose(): void {
    this.detach();
    this._handlers.clear();
    this._rpcHandlers.clear();
  }
}
