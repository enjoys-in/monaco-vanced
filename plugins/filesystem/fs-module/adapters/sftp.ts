// ── FS Module — SFTP Adapter ──────────────────────────────────
// Remote adapter: connects to SFTP server via WebSocket proxy.
// See context/fs-connections.txt Section 5a

import type { IDisposable } from "@core/types";
import type {
  AdapterCapabilities,
  DirEntry,
  FileStat,
  WatchCallback,
  SFTPAdapterConfig,
} from "../types";
import { BaseAdapter, matchGlob } from "../adapter";
import { PollingWatcher } from "../watcher";

/** SFTP channel interface — provided by user's WebSocket proxy */
interface SFTPChannel {
  readdir(path: string): Promise<Array<{ filename: string; attrs: SFTPAttrs }>>;
  stat(path: string): Promise<SFTPAttrs>;
  open(path: string, mode: string): Promise<SFTPHandle>;
  read(handle: SFTPHandle, buffer: Uint8Array, offset: number, length: number, position: number): Promise<number>;
  write(handle: SFTPHandle, buffer: Uint8Array, offset: number, length: number, position: number): Promise<void>;
  close(handle: SFTPHandle): Promise<void>;
  unlink(path: string): Promise<void>;
  rmdir(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  mkdir(path: string): Promise<void>;
}

interface SFTPAttrs {
  size: number;
  mtime: number;
  atime: number;
  uid?: number;
  gid?: number;
  mode?: number;
  isDirectory(): boolean;
}

type SFTPHandle = unknown;

/**
 * SFTP adapter — delegates to a user-provided WebSocket proxy that
 * bridges browser ↔ SSH/SFTP. The adapter never opens raw TCP sockets.
 */
export class SFTPAdapter extends BaseAdapter {
  readonly name = "sftp";
  readonly type = "remote" as const;
  readonly capabilities: AdapterCapabilities = {
    indexing: false,
    watch: true,
    search: false,
    streaming: true,
    vectorIndex: false,
    symbolGraph: false,
  };

  private sftp: SFTPChannel | null = null;
  private ws: WebSocket | null = null;
  private rootPath: string;

  constructor(private config: SFTPAdapterConfig) {
    super();
    this.rootPath = (config.rootPath ?? "/").replace(/\/+$/, "");
  }

  private resolvePath(path: string): string {
    return this.rootPath + path;
  }

  async init(): Promise<void> {
    // Connect via WebSocket to the SSH proxy
    const wsUrl = `wss://${this.config.host}:${this.config.port ?? 22}/sftp`;
    this.ws = new WebSocket(wsUrl);

    await new Promise<void>((resolve, reject) => {
      this.ws!.onopen = () => resolve();
      this.ws!.onerror = () => reject(new Error(`SFTP connection failed: ${this.config.host}`));
    });

    // The SFTP channel is established by the proxy after auth
    // In a real implementation, auth handshake happens over the WebSocket
    this.sftp = this.createSFTPProxy();
  }

  /**
   * Creates an SFTP proxy that sends commands over WebSocket.
   * Each method serializes the call and awaits the response.
   */
  private createSFTPProxy(): SFTPChannel {
    const ws = this.ws!;
    let nextId = 1;
    const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

    ws.onmessage = (event: MessageEvent) => {
      const msg = JSON.parse(event.data as string) as { id: number; result?: unknown; error?: string };
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error));
      else p.resolve(msg.result);
    };

    const call = <T>(method: string, args: unknown[]): Promise<T> => {
      const id = nextId++;
      return new Promise<T>((resolve, reject) => {
        pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
        ws.send(JSON.stringify({ id, method, args }));
      });
    };

    return {
      readdir: (path) => call("readdir", [path]),
      stat: (path) => call("stat", [path]),
      open: (path, mode) => call("open", [path, mode]),
      read: (handle, buf, off, len, pos) => call("read", [handle, off, len, pos]).then((n) => { void buf; return n as number; }),
      write: (handle, buf, off, len, pos) => call("write", [handle, Array.from(buf.slice(off, off + len)), pos]),
      close: (handle) => call("close", [handle]),
      unlink: (path) => call("unlink", [path]),
      rmdir: (path) => call("rmdir", [path]),
      rename: (from, to) => call("rename", [from, to]),
      mkdir: (path) => call("mkdir", [path]),
    };
  }

  private ensureConnected(): SFTPChannel {
    if (!this.sftp) throw new Error("SFTP not connected. Call init() first.");
    return this.sftp;
  }

  async read(path: string): Promise<Uint8Array> {
    const sftp = this.ensureConnected();
    const resolved = this.resolvePath(path);
    const stats = await sftp.stat(resolved);
    const handle = await sftp.open(resolved, "r");
    const buffer = new Uint8Array(stats.size);
    await sftp.read(handle, buffer, 0, stats.size, 0);
    await sftp.close(handle);
    return buffer;
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    const sftp = this.ensureConnected();
    const resolved = this.resolvePath(path);
    const handle = await sftp.open(resolved, "w");
    await sftp.write(handle, data, 0, data.byteLength, 0);
    await sftp.close(handle);
  }

  async delete(path: string, opts?: { recursive?: boolean }): Promise<void> {
    const sftp = this.ensureConnected();
    const resolved = this.resolvePath(path);
    const stats = await sftp.stat(resolved);
    if (stats.isDirectory()) {
      if (opts?.recursive) {
        const entries = await sftp.readdir(resolved);
        for (const entry of entries) {
          if (entry.filename === "." || entry.filename === "..") continue;
          await this.delete(path + "/" + entry.filename, { recursive: true });
        }
      }
      await sftp.rmdir(resolved);
    } else {
      await sftp.unlink(resolved);
    }
  }

  async rename(from: string, to: string): Promise<void> {
    const sftp = this.ensureConnected();
    await sftp.rename(this.resolvePath(from), this.resolvePath(to));
  }

  async list(dir: string): Promise<DirEntry[]> {
    const sftp = this.ensureConnected();
    const resolved = this.resolvePath(dir);
    const entries = await sftp.readdir(resolved);
    return entries
      .filter((e) => e.filename !== "." && e.filename !== "..")
      .map((e) => ({
        name: e.filename,
        path: dir.replace(/\/+$/, "") + "/" + e.filename,
        isDirectory: e.attrs.isDirectory(),
        size: e.attrs.size,
        modified: e.attrs.mtime * 1000,
      }));
  }

  async mkdir(path: string): Promise<void> {
    const sftp = this.ensureConnected();
    await sftp.mkdir(this.resolvePath(path));
  }

  async exists(path: string): Promise<boolean> {
    const sftp = this.ensureConnected();
    try {
      await sftp.stat(this.resolvePath(path));
      return true;
    } catch {
      return false;
    }
  }

  async stat(path: string): Promise<FileStat> {
    const sftp = this.ensureConnected();
    const attrs = await sftp.stat(this.resolvePath(path));
    return {
      size: attrs.size,
      modified: attrs.mtime * 1000,
      created: attrs.atime * 1000,
      isDirectory: attrs.isDirectory(),
      permissions: attrs.mode !== undefined ? attrs.mode.toString(8) : undefined,
    };
  }

  watch(glob: string, cb: WatchCallback): IDisposable {
    if (this.config.watchMode === "websocket" && this.config.watchSocket) {
      return this.watchViaWebSocket(glob, cb);
    }
    return this.watchViaPoll(glob, cb);
  }

  private watchViaPoll(glob: string, cb: WatchCallback): IDisposable {
    const watcher = new PollingWatcher(
      this,
      glob,
      cb,
      this.config.pollInterval ?? 3000,
    );
    watcher.start();
    return watcher;
  }

  private watchViaWebSocket(glob: string, cb: WatchCallback): IDisposable {
    const ws = this.config.watchSocket!;
    const handler = (event: MessageEvent) => {
      const msg = JSON.parse(event.data as string) as {
        type: string;
        path: string;
        changeType: "modify" | "create" | "delete";
      };
      if (msg.type === "change") {
        if (matchGlob(glob, msg.path)) {
          cb({ path: msg.path, changeType: msg.changeType });
        }
      }
    };
    ws.addEventListener("message", handler);
    return { dispose: () => ws.removeEventListener("message", handler) };
  }

  dispose(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.sftp = null;
  }
}
