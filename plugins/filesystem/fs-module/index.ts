// ── FS Module — Plugin Entry ──────────────────────────────────
// Wires EventBus ↔ adapter via the UNIFIED FS OPERATION WIRING TABLE.
// Implements Strategy Pattern (handlers) + Lifecycle Hooks (on).
// See context/fs-connections.txt + context/filesystem-advanced.txt

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import { FileEvents, FsEvents } from "@core/events/file.events";
import { ContextMenuEvents } from "@core/events";
import type {
  FSAdapter,
  FSPluginOptions,
  FSOperationHandlers,
  FSOperationLifecycle,
  FSOperationResult,
  FSOperationError,
  FSOperationName,
  DirEntry,
  FileStat,
  AdapterCapabilities,
  AdapterType,
} from "./types";

// Re-export everything consumers need
export type {
  FSAdapter,
  FSPluginOptions,
  FSOperationHandlers,
  FSOperationLifecycle,
  FSOperationResult,
  FSOperationError,
  FSOperationName,
  DirEntry,
  FileStat,
  WatchCallback,
  AdapterCapabilities,
  AdapterType,
} from "./types";
export type {
  SFTPAdapterConfig,
  APIAdapterConfig,
  APIEndpointConfig,
  LocalAdapterConfig,
  OPFSAdapterConfig,
  IndexedDBAdapterConfig,
  ProgressCallback,
  WatchChangeType,
  FSOpCallback,
} from "./types";
export { BaseAdapter, parentDir, baseName, normalizePath, joinPath, matchGlob } from "./adapter";
export { PollingWatcher } from "./watcher";
export { ConflictDetector } from "./conflict";
export { chunkedUpload, chunkedDownload, mergeChunks } from "./stream";
export { getDexieDB, closeDexieDB, closeAllDexieDBs } from "./dexie-db";
export type { MonacoVancedDB, FileRecord, SymbolRecord } from "./dexie-db";
export { SFTPAdapter } from "./adapters/sftp";
export { APIAdapter } from "./adapters/api";
export { LocalAdapter } from "./adapters/local";
export { OPFSAdapter } from "./adapters/opfs";
export { IndexedDBAdapter } from "./adapters/indexeddb";

// ── Lifecycle hook timeout ────────────────────────────────────

const HOOK_TIMEOUT_MS = 5_000;

/** Await a hook with a timeout — if it hangs, log and continue */
async function safeHook(fn: (() => void | Promise<void>) | undefined): Promise<void> {
  if (!fn) return;
  try {
    const result = fn();
    if (result && typeof (result as Promise<void>).then === "function") {
      await Promise.race([
        result,
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("Hook timeout")), HOOK_TIMEOUT_MS),
        ),
      ]);
    }
  } catch (e) {
    console.warn("[fs-module] lifecycle hook error:", e);
  }
}

// ── Strategy Pattern resolver ─────────────────────────────────

type ResolvedOp = (...args: unknown[]) => unknown;

function resolve(
  op: keyof FSOperationHandlers,
  handlers: FSOperationHandlers | undefined,
  adapter: FSAdapter,
): ResolvedOp {
  const handler = handlers?.[op];
  if (handler) return handler as ResolvedOp;
  return (adapter[op as keyof FSAdapter] as ResolvedOp).bind(adapter);
}

// ── createFSPlugin factory ────────────────────────────────────

export function createFSPlugin(options: FSPluginOptions): MonacoPlugin {
  const { adapter, handlers, on } = options;
  const autoInit = options.autoInit !== false;

  let ctx: PluginContext | null = null;
  const disposables: IDisposable[] = [];

  // ── Helper: run lifecycle hooks in order ────────────────

  async function runSuccessHooks(
    opName: FSOperationName,
    hookKey: keyof FSOperationLifecycle,
    payload: unknown,
    path: string,
    duration: number,
  ): Promise<void> {
    if (!on) return;

    // 1. Per-op hook
    const perOp = on[hookKey] as { success?: (result: unknown) => void | Promise<void> } | undefined;
    await safeHook(perOp?.success ? () => perOp.success!(payload) : undefined);

    // 2. Global onSuccess
    const result: FSOperationResult = { op: opName, path, duration, payload };
    await safeHook(on.onSuccess ? () => on.onSuccess!(result) : undefined);
  }

  async function runErrorHooks(
    opName: FSOperationName,
    hookKey: keyof FSOperationLifecycle,
    path: string,
    error: Error,
    duration: number,
  ): Promise<void> {
    if (!on) return;

    const errObj: FSOperationError = {
      op: opName,
      path,
      message: error.message,
      cause: error,
      duration,
    };

    // 1. Per-op hook
    const perOp = on[hookKey] as { error?: (err: FSOperationError) => void | Promise<void> } | undefined;
    await safeHook(perOp?.error ? () => perOp.error!(errObj) : undefined);

    // 2. Global onError
    await safeHook(on.onError ? () => on.onError!(errObj) : undefined);
  }

  // ── Helper: wire a request event to an adapter operation ──

  function wireOp<TPayload>(
    requestEvent: string,
    confirmEvent: string,
    opName: FSOperationName,
    hookKey: keyof FSOperationLifecycle,
    exec: (payload: TPayload) => Promise<{ path: string; confirmPayload: unknown; hookPayload: unknown }>,
  ): void {
    const sub = ctx!.on(requestEvent, async (data) => {
      const payload = data as TPayload;
      const start = performance.now();
      try {
        const { path, confirmPayload, hookPayload } = await exec(payload);
        const duration = performance.now() - start;

        // Hooks fire before EventBus event
        await runSuccessHooks(opName, hookKey, hookPayload, path, duration);

        // Confirm event
        ctx!.emit(confirmEvent, confirmPayload);
      } catch (e) {
        const duration = performance.now() - start;
        const err = e instanceof Error ? e : new Error(String(e));
        const path = (payload as Record<string, unknown>).path as string
          ?? (payload as Record<string, unknown>).from as string
          ?? "";

        await runErrorHooks(opName, hookKey, path, err, duration);
        ctx!.emit(FileEvents.Error, { op: opName, path, message: err.message });

        // Fire notification so the user sees the error in the UI
        ctx!.notify(`FS ${opName} failed: ${err.message}`, "error");
      }
    });
    disposables.push(sub);
  }

  // ── The plugin ──────────────────────────────────────────

  return {
    id: "fs-module",
    name: "File System",
    version: "1.0.0",
    description: "Core FS abstraction — adapter-agnostic file operations with event wiring",

    async onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      // Auto-init adapter
      if (autoInit && adapter.init) {
        await adapter.init();
      }

      // ── Register explorer context menu actions ──────────
      ctx.emit(ContextMenuEvents.Register, {
        context: "explorer",
        item: { id: "explorer.newFile", label: "New File", command: "explorer.newFile", group: "navigation", order: 1, condition: { when: "isDirectory == true" } },
      });
      ctx.emit(ContextMenuEvents.Register, {
        context: "explorer",
        item: { id: "explorer.newFolder", label: "New Folder", command: "explorer.newFolder", group: "navigation", order: 2, condition: { when: "isDirectory == true" } },
      });
      ctx.emit(ContextMenuEvents.Register, {
        context: "explorer",
        item: { id: "explorer.rename", label: "Rename", command: "explorer.rename", group: "1_modification", order: 1, condition: { when: "isFile == true || isDirectory == true" } },
      });
      ctx.emit(ContextMenuEvents.Register, {
        context: "explorer",
        item: { id: "explorer.delete", label: "Delete", command: "explorer.delete", group: "1_modification", order: 2, condition: { when: "!isRoot" } },
      });
      ctx.emit(ContextMenuEvents.Register, {
        context: "explorer",
        item: { id: "explorer.copyPath", label: "Copy Path", command: "explorer.copyPath", group: "9_cutcopypaste", order: 1 },
      });

      // ── WIRE: list ─────────────────────────────────────
      wireOp<{ dir: string }>(
        FsEvents.ListRequest,
        FsEvents.Listed,
        "list",
        "onList",
        async ({ dir }) => {
          const fn = resolve("list", handlers, adapter) as (d: string) => Promise<DirEntry[]>;
          const entries = await fn(dir);
          return {
            path: dir,
            confirmPayload: { dir, entries },
            hookPayload: { dir, entries },
          };
        },
      );

      // ── WIRE: read ─────────────────────────────────────
      wireOp<{ path: string }>(
        FileEvents.ReadRequest,
        FileEvents.Read,
        "read",
        "onRead",
        async ({ path }) => {
          const fn = resolve("read", handlers, adapter) as (p: string) => Promise<Uint8Array>;
          const data = await fn(path);
          return {
            path,
            confirmPayload: { path, data },
            hookPayload: { path, data },
          };
        },
      );

      // ── WIRE: write ────────────────────────────────────
      wireOp<{ path: string; data: Uint8Array }>(
        FileEvents.WriteRequest,
        FileEvents.Written,
        "write",
        "onWrite",
        async ({ path, data }) => {
          const fn = resolve("write", handlers, adapter) as (p: string, d: Uint8Array) => Promise<void>;
          await fn(path, data);
          return {
            path,
            confirmPayload: { path },
            hookPayload: { path },
          };
        },
      );

      // ── WIRE: delete ───────────────────────────────────
      wireOp<{ path: string; isDirectory?: boolean }>(
        FileEvents.DeleteRequest,
        FileEvents.Deleted,
        "delete",
        "onDelete",
        async ({ path, isDirectory }) => {
          const fn = resolve("delete", handlers, adapter) as (
            p: string,
            opts?: { recursive?: boolean },
          ) => Promise<void>;
          await fn(path, { recursive: isDirectory });
          return {
            path,
            confirmPayload: { path },
            hookPayload: { path },
          };
        },
      );

      // ── WIRE: rename ───────────────────────────────────
      wireOp<{ from: string; to: string }>(
        FileEvents.RenameRequest,
        FileEvents.Renamed,
        "rename",
        "onRename",
        async ({ from, to }) => {
          const fn = resolve("rename", handlers, adapter) as (f: string, t: string) => Promise<void>;
          await fn(from, to);
          return {
            path: from,
            confirmPayload: { from, to },
            hookPayload: { from, to },
          };
        },
      );

      // ── WIRE: copy ─────────────────────────────────────
      wireOp<{ from: string; to: string }>(
        FileEvents.CopyRequest,
        FileEvents.Copied,
        "copy",
        "onCopy",
        async ({ from, to }) => {
          const fn = resolve("copy", handlers, adapter) as (f: string, t: string) => Promise<void>;
          await fn(from, to);
          return {
            path: from,
            confirmPayload: { from, to },
            hookPayload: { from, to },
          };
        },
      );

      // ── WIRE: move ─────────────────────────────────────
      wireOp<{ from: string; to: string }>(
        FileEvents.MoveRequest,
        FileEvents.Moved,
        "move",
        "onMove",
        async ({ from, to }) => {
          const fn = resolve("move", handlers, adapter) as (f: string, t: string) => Promise<void>;
          await fn(from, to);
          return {
            path: from,
            confirmPayload: { from, to },
            hookPayload: { from, to },
          };
        },
      );

      // ── WIRE: create (file or dir) ─────────────────────
      wireOp<{ path: string; isDirectory: boolean }>(
        FileEvents.CreateRequest,
        FileEvents.Created,
        "mkdir",
        "onMkdir",
        async ({ path, isDirectory }) => {
          if (isDirectory) {
            const fn = resolve("mkdir", handlers, adapter) as (p: string) => Promise<void>;
            await fn(path);
          } else {
            const fn = resolve("write", handlers, adapter) as (p: string, d: Uint8Array) => Promise<void>;
            await fn(path, new Uint8Array(0));
          }
          return {
            path,
            confirmPayload: { path, isDirectory },
            hookPayload: { path },
          };
        },
      );

      // ── WIRE: exists ───────────────────────────────────
      wireOp<{ path: string }>(
        FileEvents.ExistsRequest,
        FileEvents.Exists,
        "exists",
        "onExists",
        async ({ path }) => {
          const fn = resolve("exists", handlers, adapter) as (p: string) => Promise<boolean>;
          const exists = await fn(path);
          return {
            path,
            confirmPayload: { path, exists },
            hookPayload: { path, exists },
          };
        },
      );

      // ── WIRE: stat ─────────────────────────────────────
      wireOp<{ path: string }>(
        FileEvents.StatRequest,
        FileEvents.Stat,
        "stat",
        "onStat",
        async ({ path }) => {
          const fn = resolve("stat", handlers, adapter) as (p: string) => Promise<FileStat>;
          const stat = await fn(path);
          return {
            path,
            confirmPayload: { path, stat },
            hookPayload: { path, stat },
          };
        },
      );

      // ── WIRE: upload ───────────────────────────────────
      wireOp<{ path: string; data: Uint8Array }>(
        FileEvents.UploadRequest,
        FileEvents.Uploaded,
        "upload",
        "onUpload",
        async ({ path, data }) => {
          if (handlers?.upload) {
            await handlers.upload(path, data, (loaded, total) => {
              ctx!.emit(FileEvents.UploadProgress, {
                path,
                loaded,
                total,
                percent: total > 0 ? Math.round((loaded / total) * 100) : 0,
              });
            });
          } else {
            await adapter.write(path, data);
          }
          return {
            path,
            confirmPayload: { path },
            hookPayload: { path },
          };
        },
      );

      // ── WIRE: download ─────────────────────────────────
      wireOp<{ path: string }>(
        FileEvents.DownloadRequest,
        FileEvents.Downloaded,
        "download",
        "onDownload",
        async ({ path }) => {
          let data: Uint8Array;
          if (handlers?.download) {
            data = await handlers.download(path, (loaded, total) => {
              ctx!.emit(FileEvents.DownloadProgress, {
                path,
                loaded,
                total,
                percent: total > 0 ? Math.round((loaded / total) * 100) : 0,
              });
            });
          } else {
            data = await adapter.read(path);
          }
          return {
            path,
            confirmPayload: { path, data },
            hookPayload: { path, data },
          };
        },
      );

      // ── Emit fs:connected with capabilities ────────────
      ctx.emit(FsEvents.Connected, {
        adapter: adapter.name,
        type: adapter.type,
        capabilities: adapter.capabilities,
      });
    },

    onDispose() {
      // Dispose all event subscriptions
      for (const d of disposables) d.dispose();
      disposables.length = 0;

      // Emit disconnected
      if (ctx) {
        ctx.emit(FsEvents.Disconnected, { adapter: adapter.name });
      }

      // Dispose adapter
      adapter.dispose?.();
      ctx = null;
    },
  };
}

// ── Convenience getters (attached after mount) ────────────────

export interface FSModuleAPI {
  getCapabilities(): AdapterCapabilities;
  getAdapterType(): AdapterType;
  getAdapterName(): string;
  getAdapter(): FSAdapter;
}

/**
 * Create an FSModuleAPI from a mounted adapter.
 * Consumers can call this after plugin mount to query adapter info.
 */
export function createFSModuleAPI(adapter: FSAdapter): FSModuleAPI {
  return {
    getCapabilities: () => adapter.capabilities,
    getAdapterType: () => adapter.type,
    getAdapterName: () => adapter.name,
    getAdapter: () => adapter,
  };
}

// ── OPFS with IndexedDB fallback ──────────────────────────────

import type { OPFSAdapterConfig, IndexedDBAdapterConfig } from "./types";
import { OPFSAdapter } from "./adapters/opfs";
import { IndexedDBAdapter } from "./adapters/indexeddb";

/**
 * Check if OPFS (Origin Private File System) is supported by the browser.
 */
export function isOPFSSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.storage !== "undefined" &&
    typeof navigator.storage.getDirectory === "function"
  );
}

/**
 * Create an adapter that tries OPFS first and falls back to IndexedDB
 * if the browser doesn't support OPFS. Returns the resolved adapter
 * and a boolean indicating whether fallback was used.
 */
export async function createAdapterWithOPFSFallback(
  opfsConfig: OPFSAdapterConfig,
  idbConfig?: IndexedDBAdapterConfig,
): Promise<{ adapter: FSAdapter; usedFallback: boolean }> {
  if (isOPFSSupported()) {
    try {
      const opfs = new OPFSAdapter(opfsConfig);
      await opfs.init();
      return { adapter: opfs, usedFallback: false };
    } catch {
      // OPFS init failed — fall through to IndexedDB
    }
  }

  // Fallback to IndexedDB
  const idb = new IndexedDBAdapter(idbConfig ?? { dbName: "monaco-vanced-fs" });
  await idb.init();
  return { adapter: idb, usedFallback: true };
}

/**
 * Convenience: create an FSPlugin that prefers OPFS, falls back to IndexedDB,
 * and emits a notification if fallback was used.
 */
export async function createFSPluginWithOPFSFallback(
  opfsConfig: OPFSAdapterConfig,
  idbConfig?: IndexedDBAdapterConfig,
  pluginOptions?: Omit<FSPluginOptions, "adapter" | "autoInit">,
): Promise<{ plugin: MonacoPlugin; adapter: FSAdapter; usedFallback: boolean }> {
  const { adapter, usedFallback } = await createAdapterWithOPFSFallback(opfsConfig, idbConfig);

  const plugin = createFSPlugin({
    ...pluginOptions,
    adapter,
    autoInit: false, // already initialized
  });

  // Wrap onMount to emit fallback notification
  if (usedFallback) {
    const originalOnMount = plugin.onMount;
    plugin.onMount = async (ctx) => {
      await originalOnMount?.call(plugin, ctx);
      ctx.notify(
        "OPFS not supported — using IndexedDB fallback",
        "warning",
      );
    };
  }

  return { plugin, adapter, usedFallback };
}
