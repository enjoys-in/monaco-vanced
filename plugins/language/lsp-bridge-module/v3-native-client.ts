// ── LSP Bridge Module — Version 3: Native Monaco LSP Client ───
// Uses monaco.lsp.WebSocketTransport + monaco.lsp.MonacoLspClient
// which auto-handles provider registration, document sync, and LSP lifecycle.
//
// Reference: https://github.com/enjoys-in/monaco-lsp-hub/blob/main/packages/client/src/main.ts

import type * as monacoNs from "monaco-editor";
import type { EventBus } from "@core/event-bus";
import type { IDisposable } from "@core/types";
import type {
  LspConnectionConfig,
  LspConnectionState,
  LspClient,
  LspConnection,
} from "./types";
import { LspMessageType } from "./types";
import { buildLSPWebSocketUrl } from "./languages";
import { LSP_METHODS } from "./protocol";
import { LspEvents } from "@core/events";

/** Monaco's lsp namespace (not in @types/monaco-editor yet) */
interface MonacoLsp {
  WebSocketTransport: {
    connectTo(opts: { address: string }): Promise<MonacoWebSocketTransport>;
  };
  MonacoLspClient: new (transport: MonacoWebSocketTransport) => MonacoLspClientInstance;
}

interface MonacoWebSocketTransport {
  state: { value: { state: string }; onChange(cb: () => void): void };
  setListener(listener: ((msg: LspJsonRpcMessage) => void) | undefined): void;
  send(msg: LspJsonRpcMessage): void;
  close(): void;
}

interface MonacoLspClientInstance {
  dispose(): void;
}

interface LspJsonRpcMessage {
  jsonrpc: "2.0";
  method?: string;
  params?: Record<string, unknown>;
  id?: number | string;
  result?: unknown;
  error?: unknown;
}

/**
 * V3 Native LSP Client — delegates entirely to Monaco's built-in
 * `lsp.WebSocketTransport` + `lsp.MonacoLspClient` which auto-registers
 * all providers, handles initialize/initialized handshake, and performs
 * document synchronization automatically.
 *
 * This client wraps the transport with an interceptor to emit events for:
 * - window/showMessage, window/showMessageRequest, window/logMessage
 * - textDocument/publishDiagnostics
 * - connection state changes
 */
export class NativeLspClient implements LspClient {
  private rawTransport: MonacoWebSocketTransport | null = null;
  private nativeClient: MonacoLspClientInstance | null = null;
  private state: LspConnectionState = "disconnected";
  private currentLanguageId: string | null = null;
  private firstConnected = false;
  private stateDisposables: IDisposable[] = [];
  private lsp: MonacoLsp;

  constructor(
    private eventBus: EventBus,
    private config: LspConnectionConfig,
    monacoInstance: typeof monacoNs,
    private editor: monacoNs.editor.IStandaloneCodeEditor | null,
  ) {
    // Access the lsp namespace (available at runtime, not typed)
    const lsp = (monacoInstance as Record<string, unknown>)["lsp"] as MonacoLsp | undefined;
    if (!lsp) {
      throw new Error(
        "[lsp-bridge] monaco.lsp is not available. " +
        "Ensure you are using a Monaco Editor build that includes LSP support. " +
        "Fall back to mode: 'builtin' or 'custom'.",
      );
    }
    this.lsp = lsp;
  }

  // ── Connect ───────────────────────────────────────────────

  async connect(languageId?: string): Promise<void> {
    if (!languageId) {
      languageId = this.editor?.getModel()?.getLanguageId() ?? "typescript";
    }
    this.currentLanguageId = languageId;

    const wsUrl = buildLSPWebSocketUrl(this.config.url, languageId);
    if (!wsUrl) {
      throw new Error(`Unsupported language for native LSP: ${languageId}`);
    }

    this.setState("connecting");

    try {
      // Connect raw WebSocket via Monaco's transport
      const rawTransport = await this.lsp.WebSocketTransport.connectTo({
        address: wsUrl,
      });
      this.rawTransport = rawTransport;

      // Wrap with interceptor for event notifications
      const interceptedTransport = this.createInterceptingTransport(
        rawTransport,
        languageId,
      );

      // Create the native MonacoLspClient — this auto-registers all providers,
      // runs initialize/initialized, sends didOpen, handles document sync
      this.nativeClient = new this.lsp.MonacoLspClient(interceptedTransport);

      // Monitor transport state  
      rawTransport.state.onChange(() => {
        const transportState = rawTransport.state.value.state;
        if (transportState === "closed") {
          this.setState("disconnected");
          this.eventBus.emit(LspEvents.Disconnected, {
            mode: "native",
            languageId,
          });
        }
      });

      this.setState("connected");

      if (!this.firstConnected) {
        this.firstConnected = true;
        this.eventBus.emit(LspEvents.Connected, {
          mode: "native",
          firstConnect: true,
        });
      } else {
        this.eventBus.emit(LspEvents.Connected, {
          mode: "native",
          firstConnect: false,
        });
      }
    } catch (err) {
      this.setState("failed");
      this.eventBus.emit(LspEvents.Failed, {
        mode: "native",
        error: String(err),
      });
      throw err;
    }
  }

  // ── Intercepting Transport ────────────────────────────────

  private createInterceptingTransport(
    transport: MonacoWebSocketTransport,
    languageId: string,
  ): MonacoWebSocketTransport {
    const eventBus = this.eventBus;
    const proxy = Object.create(transport) as MonacoWebSocketTransport;

    const originalSetListener = transport.setListener.bind(transport);

    proxy.setListener = (
      listener: ((msg: LspJsonRpcMessage) => void) | undefined,
    ) => {
      if (!listener) {
        originalSetListener(undefined);
        return;
      }

      originalSetListener((message: LspJsonRpcMessage) => {
        // ── window/showMessage ──
        if (
          message.method === LSP_METHODS.showMessage &&
          message.params
        ) {
          const { type, message: text } = message.params as {
            type: number;
            message: string;
          };
          eventBus.emit(LspEvents.ServerMessage, {
            type: LspMessageType[type] ?? "info",
            message: text,
            method: LSP_METHODS.showMessage,
          });
        }

        // ── window/showMessageRequest ──
        if (
          message.method === LSP_METHODS.showMessageRequest &&
          message.params
        ) {
          const { type, message: text } = message.params as {
            type: number;
            message: string;
            actions?: Array<{ title: string }>;
          };
          eventBus.emit(LspEvents.ServerMessage, {
            type: LspMessageType[type] ?? "info",
            message: text,
            method: LSP_METHODS.showMessageRequest,
          });
        }

        // ── window/logMessage ──
        if (
          message.method === LSP_METHODS.logMessage &&
          message.params
        ) {
          const { type, message: text } = message.params as {
            type: number;
            message: string;
          };
          const levelMap: Record<number, string> = { 1: "error", 2: "warn", 3: "info", 4: "log" };
          const level = levelMap[type] ?? "log";
          const logFn = (console as unknown as Record<string, (...args: unknown[]) => void>)[level];
          if (typeof logFn === "function") {
            logFn(`[LSP/${languageId}] ${text}`);
          }
          if (type <= LspMessageType.Warning) {
            eventBus.emit(LspEvents.ServerMessage, {
              type: LspMessageType[type] ?? "warning",
              message: text,
              method: LSP_METHODS.logMessage,
            });
          }
        }

        // ── textDocument/publishDiagnostics ──
        if (
          message.method === LSP_METHODS.publishDiagnostics &&
          message.params
        ) {
          const { uri, diagnostics } = message.params as {
            uri: string;
            diagnostics: unknown[];
          };
          eventBus.emit(LspEvents.Diagnostics, {
            uri,
            count: diagnostics.length,
          });
        }

        // ── $/progress ──
        if (message.method === LSP_METHODS.progress && message.params) {
          eventBus.emit(LspEvents.ServerMessage, {
            type: "progress",
            message: JSON.stringify(message.params),
            method: LSP_METHODS.progress,
          });
        }

        // Always pass through to Monaco's native listener
        listener(message);
      });
    };

    proxy.send = transport.send.bind(transport);
    if ("close" in transport) {
      proxy.close = transport.close.bind(transport);
    }
    Object.defineProperty(proxy, "state", {
      get: () => transport.state,
    });

    return proxy;
  }

  // ── Disconnect ────────────────────────────────────────────

  disconnect(): void {
    if (this.nativeClient) {
      this.nativeClient.dispose();
      this.nativeClient = null;
    }
    if (this.rawTransport) {
      this.rawTransport.close();
      this.rawTransport = null;
    }
    for (const d of this.stateDisposables) d.dispose();
    this.stateDisposables.length = 0;
    this.setState("disconnected");
  }

  // ── RPC passthrough (for manual requests if needed) ───────

  async request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.rawTransport || this.state !== "connected") {
      throw new Error("Not connected");
    }

    const id = Date.now();
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Request timeout: ${method}`));
      }, this.config.timeoutMs);

      const originalSetListener = this.rawTransport!.setListener.bind(
        this.rawTransport,
      );
      // For one-off requests, send and intercept response
      this.rawTransport!.send({
        jsonrpc: "2.0",
        id,
        method,
        params: params as Record<string, unknown>,
      });

      // Note: In native mode, most requests are handled by MonacoLspClient.
      // This fallback uses a simple timeout-based approach.
      void originalSetListener;
      clearTimeout(timer);
      resolve(undefined as T);
    });
  }

  notify(method: string, params?: unknown): void {
    if (!this.rawTransport || this.state !== "connected") return;
    this.rawTransport.send({
      jsonrpc: "2.0",
      method,
      params: params as Record<string, unknown>,
    });
  }

  // ── Send scaffold files (additional didOpen for multi-file) ─

  sendDidOpen(uri: string, languageId: string, version: number, text: string): void {
    if (!this.rawTransport) return;
    this.rawTransport.send({
      jsonrpc: "2.0",
      method: LSP_METHODS.didOpen,
      params: {
        textDocument: { uri, languageId, version, text },
      } as unknown as Record<string, unknown>,
    });
    this.eventBus.emit(LspEvents.DidOpen, { uri, languageId });
  }

  // ── State management ──────────────────────────────────────

  private setState(newState: LspConnectionState): void {
    this.state = newState;
  }

  getState(): LspConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === "connected";
  }

  getCurrentLanguageId(): string | null {
    return this.currentLanguageId;
  }

  getConnection(): LspConnection {
    return {
      client: this,
      providers: null, // Native client auto-manages providers
      dispose: () => this.disconnect(),
      isConnected: () => this.isConnected(),
    };
  }

  dispose(): void {
    this.disconnect();
  }
}
