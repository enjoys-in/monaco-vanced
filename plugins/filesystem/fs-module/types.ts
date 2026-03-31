// ── FS Module — Shared Types ──────────────────────────────────
// See context/fs-connections.txt + context/filesystem-advanced.txt

import type { IDisposable } from "@core/types";

// ── Adapter identity ──────────────────────────────────────────

export type AdapterType = "remote" | "local";

export interface AdapterCapabilities {
  /** Can the adapter walk all files for full indexing? */
  indexing: boolean;
  /** Does the adapter support real-time file watching? */
  watch: boolean;
  /** Does the adapter support server-side search? */
  search: boolean;
  /** Does the adapter support chunked upload/download? */
  streaming: boolean;
  /** Can files be embedded for RAG/vector search? */
  vectorIndex: boolean;
  /** Can a full symbol/call graph be built? */
  symbolGraph: boolean;
}

// ── Directory entry & file stat ───────────────────────────────

export interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  /** Unix timestamp (ms) */
  modified: number;
}

export interface FileStat {
  size: number;
  /** Unix timestamp (ms) */
  modified: number;
  /** Unix timestamp (ms) */
  created: number;
  isDirectory: boolean;
  permissions?: string;
}

// ── Watch callback ────────────────────────────────────────────

export type WatchChangeType = "modify" | "create" | "delete";

export type WatchCallback = (event: {
  path: string;
  changeType: WatchChangeType;
}) => void;

// ── Progress callback (streaming uploads/downloads) ───────────

export type ProgressCallback = (loaded: number, total: number) => void;

// ── FSAdapter interface ───────────────────────────────────────

export interface FSAdapter {
  /** Adapter name: "sftp" | "api" | "local" | "opfs" | "indexeddb" */
  readonly name: string;
  /** "remote" or "local" */
  readonly type: AdapterType;
  /** Feature capabilities of this adapter */
  readonly capabilities: AdapterCapabilities;

  // ── CRUD ───────────────────────────────────────────────

  read(path: string): Promise<Uint8Array>;
  write(path: string, data: Uint8Array): Promise<void>;
  delete(path: string, opts?: { recursive?: boolean }): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
  move(from: string, to: string): Promise<void>;

  // ── Directory ──────────────────────────────────────────

  list(dir: string): Promise<DirEntry[]>;
  mkdir(path: string, opts?: { recursive?: boolean }): Promise<void>;

  // ── Query ──────────────────────────────────────────────

  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<FileStat>;

  // ── Watch ──────────────────────────────────────────────

  watch(glob: string, cb: WatchCallback): IDisposable;

  // ── Lifecycle ──────────────────────────────────────────

  /** Called once on plugin mount (optional connect/init) */
  init?(): Promise<void>;
  /** Called on plugin dispose */
  dispose?(): void;
}

// ── Per-operation custom handlers (Strategy Pattern) ──────────

export interface FSOperationHandlers {
  read?: (path: string) => Promise<Uint8Array>;
  write?: (path: string, data: Uint8Array) => Promise<void>;
  delete?: (path: string, opts?: { recursive?: boolean }) => Promise<void>;
  rename?: (from: string, to: string) => Promise<void>;
  copy?: (from: string, to: string) => Promise<void>;
  move?: (from: string, to: string) => Promise<void>;
  list?: (dir: string) => Promise<DirEntry[]>;
  mkdir?: (path: string, opts?: { recursive?: boolean }) => Promise<void>;
  exists?: (path: string) => Promise<boolean>;
  stat?: (path: string) => Promise<FileStat>;
  watch?: (glob: string, cb: WatchCallback) => IDisposable;
  upload?: (path: string, data: Uint8Array, onProgress?: ProgressCallback) => Promise<void>;
  download?: (path: string, onProgress?: ProgressCallback) => Promise<Uint8Array>;
}

// ── Operation lifecycle hooks ─────────────────────────────────

export type FSOperationName =
  | "read" | "write" | "delete" | "rename" | "copy" | "move"
  | "list" | "mkdir" | "exists" | "stat" | "upload" | "download" | "watch";

export interface FSOperationResult {
  op: FSOperationName;
  path: string;
  duration: number;
  payload: unknown;
}

export interface FSOperationError {
  op: FSOperationName;
  path: string;
  message: string;
  cause?: Error;
  duration: number;
}

export interface FSOpCallback<T> {
  success?: (result: T) => void | Promise<void>;
  error?: (error: FSOperationError) => void | Promise<void>;
}

export interface FSOperationLifecycle {
  /** After ANY operation succeeds, before the confirm event */
  onSuccess?: (result: FSOperationResult) => void | Promise<void>;
  /** After ANY operation fails, before the error event */
  onError?: (error: FSOperationError) => void | Promise<void>;

  onRead?: FSOpCallback<{ path: string; data: Uint8Array }>;
  onWrite?: FSOpCallback<{ path: string }>;
  onDelete?: FSOpCallback<{ path: string }>;
  onRename?: FSOpCallback<{ from: string; to: string }>;
  onCopy?: FSOpCallback<{ from: string; to: string }>;
  onMove?: FSOpCallback<{ from: string; to: string }>;
  onList?: FSOpCallback<{ dir: string; entries: DirEntry[] }>;
  onMkdir?: FSOpCallback<{ path: string }>;
  onUpload?: FSOpCallback<{ path: string }>;
  onDownload?: FSOpCallback<{ path: string; data: Uint8Array }>;
  onWatch?: FSOpCallback<{ glob: string }>;
  onStat?: FSOpCallback<{ path: string; stat: FileStat }>;
  onExists?: FSOpCallback<{ path: string; exists: boolean }>;
}

// ── Plugin options ────────────────────────────────────────────

export interface FSPluginOptions {
  /** Primary adapter — handles all operations by default */
  adapter: FSAdapter;
  /** Per-operation overrides (Strategy Pattern) */
  handlers?: FSOperationHandlers;
  /** Operation lifecycle hooks */
  on?: FSOperationLifecycle;
  /** Auto-initialize adapter on mount (default: true) */
  autoInit?: boolean;
}

// ── SFTP adapter config ───────────────────────────────────────

export interface SFTPAdapterConfig {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
  rootPath?: string;
  maxConnections?: number;
  keepAliveInterval?: number;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  watchMode?: "poll" | "websocket";
  pollInterval?: number;
  watchSocket?: WebSocket;
}

// ── API adapter config ────────────────────────────────────────

export interface APIEndpointConfig {
  method: string;
  path: string;
  body?: Record<string, unknown>;
  multipart?: boolean;
  binary?: boolean;
}

export interface APIAdapterConfig {
  baseUrl: string;
  authProvider?: { getToken(): Promise<string> };
  staticToken?: string;
  endpoints?: Partial<Record<string, APIEndpointConfig>>;
  transformers?: {
    list?: (data: unknown) => DirEntry[];
    stat?: (data: unknown) => FileStat;
  };
  handlers?: Partial<FSOperationHandlers>;
  watch?: {
    mode: "websocket" | "sse" | "poll";
    url?: string;
    reconnect?: boolean;
    pollInterval?: number;
  };
}

// ── Local adapter config ──────────────────────────────────────

export interface LocalAdapterConfig {
  mode: "browser" | "electron" | "node";
  rootHandle?: FileSystemDirectoryHandle;
  rootPath?: string;
  watchMode?: "native" | "poll";
  pollInterval?: number;
}

// ── OPFS adapter config ──────────────────────────────────────

export interface OPFSAdapterConfig {
  rootDir: string;
  pollInterval?: number;
}

// ── IndexedDB adapter config ─────────────────────────────────

export interface IndexedDBAdapterConfig {
  dbName?: string;
  storeName?: string;
  version?: number;
  pollInterval?: number;
}
