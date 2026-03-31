/**
 * Context Engine LSP Package — describes the LSP server package structure
 * Server URL from env: LSP_URL (default: https://monaco-lsp-hub.onrender.com/)
 *
 * Source: https://github.com/enjoys-in/context-engine/blob/main/lsp/package.json
 */

/** LSP server package.json structure */
export interface ContextEngineLspPackage {
  name: string;                 // "@enjoys/context-engine-lsp"
  version: string;              // "1.0.0"
  description: string;          // "WebSocket JSON-RPC language server..."
  type: "module";
  main: string;                 // "src/server.ts"
  private: boolean;
  scripts: {
    build: string;
    start: string;
    dev: string;
    typecheck: string;
  };
  devDependencies: Record<string, string>;
  dependencies: Record<string, string>;
}

/** LSP connection configuration */
export interface LspConnectionConfig {
  /** WebSocket server URL — from env LSP_URL */
  url: string;

  /** Retry interval in ms (default: 15000 = 15s) */
  retryIntervalMs: number;

  /** Max retry attempts before giving up (default: 10) */
  maxRetries: number;

  /** Connection timeout per attempt in ms (default: 10000) */
  timeoutMs: number;
}

/** LSP connection state */
export type LspConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed";

/** LSP connection state detail */
export interface LspConnectionState {
  status: LspConnectionStatus;
  url: string;
  retryCount: number;
  lastConnectedAt: number | null;
  lastError: string | null;
}

/** JSON-RPC request over WebSocket */
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: unknown;
}

/** JSON-RPC response over WebSocket */
export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/** JSON-RPC notification (no id = no response expected) */
export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}
