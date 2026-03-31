// ── LSP Bridge Module — Version 2: Built-in Monaco LSP Client ──
// See context/lsp-bridge-module.txt Section 6
//
// Full LSP lifecycle: WebSocket, initialize/initialized handshake,
// textDocument/didOpen + didChange, diagnostics bridge, 24 providers.

import type * as monacoNs from "monaco-editor";
import type { EventBus } from "@core/event-bus";
import type { IDisposable } from "@core/types";
import type {
  LspConnectionConfig,
  LspConnectionState,
  LspClient,
  LspConnection,
  LspProviderRegistration,
  PendingRequest,
  JsonRpcResponse,
  JsonRpcNotification,
} from "./types";
import { LspMessageType } from "./types";
import { LspConnectionManager } from "./connection";
import { buildLSPWebSocketUrl } from "./languages";
import { LSP_METHODS } from "./protocol";
import { setMonacoRef, toMonacoMarkers } from "./converters";
import { registerLSPProviders } from "./v2-providers";
import { LspEvents } from "@core/events";

/**
 * V2 Built-in LSP Client — full LSP lifecycle with initialize handshake,
 * textDocument/didOpen & didChange document sync, diagnostics bridge,
 * and 24 typed Monaco providers.
 */
export class BuiltinLspClient implements LspClient {
  private ws: WebSocket | null = null;
  private manager: LspConnectionManager;
  private pendingRequests = new Map<number, PendingRequest>();
  private nextRequestId = 1;
  private serverCapabilities: Record<string, unknown> = {};
  private providerRegistration: LspProviderRegistration | null = null;
  private documentVersions = new Map<string, number>();
  private syncDisposables: IDisposable[] = [];
  private currentLanguageId: string | null = null;

  constructor(
    private eventBus: EventBus,
    private config: LspConnectionConfig,
    private monacoInstance: typeof monacoNs,
    private editor: monacoNs.editor.IStandaloneCodeEditor | null,
  ) {
    this.manager = new LspConnectionManager(eventBus, config);
    setMonacoRef(monacoInstance);
  }

  // ── Connect ───────────────────────────────────────────────

  async connect(languageId?: string): Promise<void> {
    if (!languageId) {
      languageId = this.editor?.getModel()?.getLanguageId() ?? "typescript";
    }
    this.currentLanguageId = languageId;

    const wsUrl = buildLSPWebSocketUrl(this.config.url, languageId);
    if (!wsUrl) {
      throw new Error(`Unsupported language: ${languageId}`);
    }

    this.manager.transition("connecting");

    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = async () => {
        try {
          await this.performInitializeHandshake(languageId!);
          this.manager.transition("connected");
          this.manager.resetRetries();

          if (this.manager.markFirstConnect()) {
            this.eventBus.emit(LspEvents.Connected, { mode: "builtin", firstConnect: true });
          }

          // Register all 24 providers guarded by capabilities
          this.providerRegistration = registerLSPProviders(
            this.monacoInstance,
            languageId!,
            this,
            this.serverCapabilities,
          );

          // Send didOpen for current model
          this.sendDidOpen(languageId!);

          // Subscribe to content changes
          this.setupDidChange();

          // Start liveness ping
          this.manager.startPing(() => {
            this.handleDisconnect(languageId!);
          });

          resolve();
        } catch (err) {
          reject(err);
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data as string, languageId!);
      };

      ws.onerror = () => {
        reject(new Error("WebSocket connection error"));
      };

      ws.onclose = () => {
        this.manager.stopPing();
        this.handleDisconnect(languageId!);
      };
    });
  }

  private handleDisconnect(languageId: string): void {
    if (this.manager.getState() === "disconnected" || this.manager.getState() === "failed") {
      return;
    }
    this.disposeProviders();
    this.manager.scheduleRetry(() => this.connect(languageId));
  }

  // ── Disconnect ────────────────────────────────────────────

  disconnect(): void {
    this.manager.cancelRetry();
    this.manager.stopPing();
    this.disposeProviders();
    this.disposeSyncListeners();

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

  // ── 6B — Initialize Handshake ─────────────────────────────

  private async performInitializeHandshake(languageId: string): Promise<void> {
    const result = await this.request<{
      capabilities: Record<string, unknown>;
    }>(LSP_METHODS.initialize, {
      processId: null,
      rootUri: this.config.rootUri,
      capabilities: {
        textDocument: {
          completion: { completionItem: { snippetSupport: true } },
          hover: { contentFormat: ["markdown", "plaintext"] },
          signatureHelp: {
            signatureInformation: {
              parameterInformation: { labelOffsetSupport: true },
            },
          },
          synchronization: { didSave: true, willSave: false },
          codeAction: {
            codeActionLiteralSupport: {
              codeActionKind: { valueSet: [] },
            },
          },
          semanticTokens: {
            requests: { full: true, range: true },
            tokenTypes: [
              "namespace", "type", "class", "enum", "interface", "struct",
              "typeParameter", "parameter", "variable", "property",
              "enumMember", "event", "function", "method", "macro",
              "keyword", "modifier", "comment", "string", "number",
              "regexp", "operator", "decorator",
            ],
            tokenModifiers: [
              "declaration", "definition", "readonly", "static", "deprecated",
              "abstract", "async", "modification", "documentation", "defaultLibrary",
            ],
          },
          inlayHint: {
            resolveSupport: {
              properties: [
                "tooltip", "textEdits",
                "label.tooltip", "label.location", "label.command",
              ],
            },
          },
        },
        workspace: {
          workspaceFolders: true,
          didChangeConfiguration: { dynamicRegistration: false },
        },
      },
      initializationOptions: {},
    });

    this.serverCapabilities = result.capabilities;
    void languageId; // Used for context but not in the handshake params

    // Send "initialized" notification
    this.notify(LSP_METHODS.initialized, {});
  }

  // ── 6C — Document Synchronization ─────────────────────────

  private sendDidOpen(languageId: string): void {
    const model = this.editor?.getModel();
    if (!model) return;

    const uri = model.uri.toString();
    this.documentVersions.set(uri, 1);

    this.notify(LSP_METHODS.didOpen, {
      textDocument: {
        uri,
        languageId,
        version: 1,
        text: model.getValue(),
      },
    });

    this.eventBus.emit(LspEvents.DidOpen, { uri, languageId });
  }

  private setupDidChange(): void {
    this.disposeSyncListeners();

    const model = this.editor?.getModel();
    if (!model) return;

    const disposable = model.onDidChangeContent(() => {
      const uri = model.uri.toString();
      const version = (this.documentVersions.get(uri) ?? 0) + 1;
      this.documentVersions.set(uri, version);

      // Full document sync (not incremental) for simplicity
      this.notify(LSP_METHODS.didChange, {
        textDocument: { uri, version },
        contentChanges: [{ text: model.getValue() }],
      });

      this.eventBus.emit(LspEvents.DidChange, { uri, version });
    });

    this.syncDisposables.push(disposable);
  }

  private disposeSyncListeners(): void {
    for (const d of this.syncDisposables) d.dispose();
    this.syncDisposables.length = 0;
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

  // ── Message handling ──────────────────────────────────────

  private handleMessage(raw: string, languageId: string): void {
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
      this.handleServerNotification(notification, languageId);
    }
  }

  // ── 6D — Diagnostics Bridge + 6E — Server Messages ───────

  private handleServerNotification(
    notification: JsonRpcNotification,
    languageId: string,
  ): void {
    const { method, params } = notification;

    // textDocument/publishDiagnostics
    if (method === LSP_METHODS.publishDiagnostics) {
      const { uri, diagnostics } = params as {
        uri: string;
        diagnostics: Array<{
          range: { start: { line: number; character: number }; end: { line: number; character: number } };
          severity?: number;
          code?: string | number;
          source?: string;
          message: string;
        }>;
      };

      const model = this.monacoInstance.editor.getModels().find(
        (m) => m.uri.toString() === uri,
      );
      if (model) {
        const markers = toMonacoMarkers(this.monacoInstance, diagnostics);
        this.monacoInstance.editor.setModelMarkers(model, `lsp-${languageId}`, markers);
      }

      this.eventBus.emit(LspEvents.Diagnostics, { uri, count: diagnostics.length });
      return;
    }

    // window/showMessage
    if (method === LSP_METHODS.showMessage) {
      const { type, message } = params as { type: number; message: string };
      this.eventBus.emit(LspEvents.ServerMessage, {
        type: LspMessageType[type] ?? "info",
        message,
      });
      return;
    }

    // window/logMessage
    if (method === LSP_METHODS.logMessage) {
      const { type, message } = params as { type: number; message: string };
      if (type <= LspMessageType.Warning) {
        this.eventBus.emit(LspEvents.ServerMessage, {
          type: LspMessageType[type] ?? "warning",
          message,
        });
      }
    }
  }

  // ── Provider cleanup ──────────────────────────────────────

  private disposeProviders(): void {
    if (this.providerRegistration) {
      this.providerRegistration.dispose();
      this.providerRegistration = null;
    }
  }

  // ── State ─────────────────────────────────────────────────

  getState(): LspConnectionState {
    return this.manager.getState();
  }

  isConnected(): boolean {
    return this.manager.isConnected();
  }

  getServerCapabilities(): Record<string, unknown> {
    return this.serverCapabilities;
  }

  getCurrentLanguageId(): string | null {
    return this.currentLanguageId;
  }

  retry(): void {
    this.manager.resetRetries();
    const langId = this.currentLanguageId ?? "typescript";
    this.connect(langId).catch(() => {});
  }

  getConnection(): LspConnection {
    return {
      client: this,
      providers: this.providerRegistration,
      dispose: () => this.disconnect(),
      isConnected: () => this.isConnected(),
    };
  }

  dispose(): void {
    this.disconnect();
    this.documentVersions.clear();
    this.manager.dispose();
  }
}
