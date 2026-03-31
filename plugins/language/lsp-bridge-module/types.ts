// ── LSP Bridge Module — Shared Types ──────────────────────────
// See context/lsp-bridge-module.txt Section 3

import type { IDisposable } from "@core/types";

// ── 3A — Connection config ────────────────────────────────────

export interface LspConnectionConfig {
  /** LSP server base URL (language path appended at runtime) */
  url: string;
  /** Retry interval in ms (default: 15000) */
  retryIntervalMs: number;
  /** Max retries before giving up (default: 10) */
  maxRetries: number;
  /** Request timeout in ms (default: 10000) */
  timeoutMs: number;
  /** Root URI for workspace (default: "file:///workspace") */
  rootUri: string;
  /** Enable periodic liveness ping (default: true) */
  pingEnabled: boolean;
  /** Ping interval in ms (default: 15000, min: 15000, max: 120000) */
  pingIntervalMs: number;
}

export const DEFAULT_LSP_CONFIG: LspConnectionConfig = {
  url: "https://monaco-lsp-hub.onrender.com",
  retryIntervalMs: 15_000,
  maxRetries: 10,
  timeoutMs: 10_000,
  rootUri: "file:///workspace",
  pingEnabled: true,
  pingIntervalMs: 15_000,
};

// ── 3B — Connection state ─────────────────────────────────────

export type LspConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed";

export type LspMode = "custom" | "builtin" | "native";

// ── 3C — JSON-RPC message types ───────────────────────────────

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}

// ── 3D — Connection options (shared by V1 and V2) ─────────────

export interface LspConnectionOptions {
  /** Monaco language ID */
  languageId: string;
  /** Full WebSocket URL */
  wsUrl: string;
  /** For textDocument/didOpen (V2 builds automatically) */
  documentUri?: string;
  /** Workspace root URI */
  rootUri?: string;
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Reconnect delay in ms (default: 15000) */
  reconnectDelay?: number;
}

// ── 3E — Connection result ────────────────────────────────────

export interface LspConnection {
  /** The underlying client (V1 or V2) */
  client: LspClient;
  /** Registered providers (null for V1 unless bridge is used) */
  providers: LspProviderRegistration | null;
  /** Dispose the connection and all providers */
  dispose(): void;
  /** Check if the connection is active */
  isConnected(): boolean;
}

export interface LspProviderRegistration {
  disposables: IDisposable[];
  dispose(): void;
}

// ── Client interface (common to V1 and V2) ────────────────────

export interface LspClient {
  connect(languageId?: string): Promise<void>;
  disconnect(): void;
  request<T = unknown>(method: string, params?: unknown): Promise<T>;
  notify(method: string, params?: unknown): void;
  getState(): LspConnectionState;
  isConnected(): boolean;
}

// ── Pending request tracking ──────────────────────────────────

export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  method: string;
  timer: ReturnType<typeof setTimeout>;
}

// ── Plugin options ────────────────────────────────────────────

export interface LspBridgePluginOptions {
  /** LSP client mode (default: "native") */
  mode?: LspMode;
  /** LSP server base URL */
  url?: string;
  /** Auto-connect on startup (default: true) */
  autoConnect?: boolean;
  /** Enable LSP connection (default: true) */
  enabled?: boolean;
  /** Retry interval in ms */
  retryIntervalMs?: number;
  /** Max retries */
  maxRetries?: number;
  /** Request timeout in ms */
  timeoutMs?: number;
  /** Root workspace URI */
  rootUri?: string;
  /** Enable liveness ping */
  pingEnabled?: boolean;
  /** Ping interval in ms */
  pingIntervalMs?: number;
}

// ── LSP message types (for window/showMessage) ────────────────

export enum LspMessageType {
  Error = 1,
  Warning = 2,
  Info = 3,
  Log = 4,
  Debug = 5,
}

// ── Connector API (exposed to consumer) ───────────────────────

/**
 * The full LSP connector API returned by `createLspConnectorPlugin()`.
 * Gives the consumer raw access to the active client, event bus,
 * editor context, and connection lifecycle — they handle everything.
 */
export interface LspConnectorApi {
  /** The active LSP client — send requests, notifications, check state */
  readonly client: LspClient | null;
  /** Current connection config (mutable for URL/timeout changes) */
  readonly config: LspConnectionConfig;
  /** Current LSP mode */
  readonly mode: LspMode;

  // ── Lifecycle ──────────────────────────────────────────

  /** Connect (or reconnect) for a given language */
  connect(languageId?: string): Promise<void>;
  /** Disconnect the active client */
  disconnect(): void;
  /** Switch LSP mode at runtime — disposes current client, creates new one */
  switchMode(newMode: LspMode): void;
  /** Change server URL and optionally reconnect */
  changeUrl(url: string, reconnect?: boolean): void;

  // ── RPC shorthand (delegates to active client) ─────────

  /** Send a JSON-RPC request and await the response */
  request<T = unknown>(method: string, params?: unknown): Promise<T>;
  /** Send a JSON-RPC notification (fire-and-forget) */
  notify(method: string, params?: unknown): void;

  // ── Event bus (cross-plugin + LSP events) ──────────────

  /** Emit an event on the shared event bus */
  emit(event: string, data?: unknown): void;
  /** Subscribe to an event — returns disposable */
  on(event: string, handler: (data?: unknown) => void): IDisposable;

  // ── State ──────────────────────────────────────────────

  /** Current connection state */
  getState(): LspConnectionState;
  /** Whether the client is connected */
  isConnected(): boolean;
  /** Current language ID the client is connected for */
  getCurrentLanguageId(): string | null;
  /** Check if a language has LSP support */
  hasLanguageSupport(languageId: string): boolean;

  // ── Cleanup ────────────────────────────────────────────

  /** Dispose everything — client, providers, listeners */
  dispose(): void;
}
