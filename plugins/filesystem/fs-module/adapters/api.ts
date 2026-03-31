// ── FS Module — API Adapter ───────────────────────────────────
// Remote adapter: REST/HTTP endpoints for file operations.
// See context/fs-connections.txt Section 5b

import type { IDisposable } from "@core/types";
import type {
  AdapterCapabilities,
  APIAdapterConfig,
  APIEndpointConfig,
  DirEntry,
  FileStat,
  FSOperationHandlers,
  WatchCallback,
} from "../types";
import { BaseAdapter, matchGlob } from "../adapter";
import { PollingWatcher } from "../watcher";

/** Default endpoint mapping (REST conventions) */
const DEFAULT_ENDPOINTS: Record<string, APIEndpointConfig> = {
  read:   { method: "GET",    path: "/files/:path" },
  write:  { method: "PUT",    path: "/files/:path", binary: true },
  delete: { method: "DELETE", path: "/files/:path" },
  rename: { method: "PATCH",  path: "/files/:path" },
  list:   { method: "GET",    path: "/dirs/:path" },
  mkdir:  { method: "POST",   path: "/dirs/:path" },
  exists: { method: "HEAD",   path: "/files/:path" },
  stat:   { method: "GET",    path: "/files/:path?stat=1" },
};

type EndpointKey = "read" | "write" | "delete" | "rename" | "list" | "mkdir" | "exists" | "stat";

/**
 * REST/HTTP adapter — maps each FS operation to a configurable endpoint.
 * Supports authProvider (async JWT) or staticToken. Watch via SSE, WebSocket, or polling.
 */
export class APIAdapter extends BaseAdapter {
  readonly name = "api";
  readonly type = "remote" as const;
  readonly capabilities: AdapterCapabilities = {
    indexing: false,
    watch: true,
    search: false,
    streaming: true,
    vectorIndex: false,
    symbolGraph: false,
  };

  private baseUrl: string;
  private endpoints: Record<string, APIEndpointConfig>;
  private userHandlers: Partial<FSOperationHandlers>;

  constructor(private config: APIAdapterConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.endpoints = { ...DEFAULT_ENDPOINTS, ...(config.endpoints ?? {}) } as Record<string, APIEndpointConfig>;
    this.userHandlers = config.handlers ?? {};
  }

  // ───── HTTP helpers ─────

  private async headers(): Promise<Record<string, string>> {
    const h: Record<string, string> = {};
    if (this.config.authProvider) {
      h["Authorization"] = `Bearer ${await this.config.authProvider.getToken()}`;
    } else if (this.config.staticToken) {
      h["Authorization"] = `Bearer ${this.config.staticToken}`;
    }
    return h;
  }

  private resolveEndpoint(key: EndpointKey, path: string): { method: string; url: string } {
    const ep = this.endpoints[key] ?? DEFAULT_ENDPOINTS[key]!;
    const [basePath, qs] = ep.path.split("?", 2) as [string, string | undefined];
    const resolved = basePath.replace(":path", encodeURIComponent(path));
    const url = `${this.baseUrl}${resolved}${qs ? "?" + qs : ""}`;
    return { method: ep.method, url };
  }

  private async fetchRaw(key: EndpointKey, path: string, init?: RequestInit): Promise<Response> {
    const { method, url } = this.resolveEndpoint(key, path);
    const hdrs = await this.headers();
    const res = await fetch(url, {
      method,
      ...init,
      headers: { ...hdrs, ...(init?.headers as Record<string, string> ?? {}) },
    });
    if (!res.ok) {
      throw new Error(`API ${method} ${url} → ${res.status} ${res.statusText}`);
    }
    return res;
  }

  // ───── FSAdapter interface ─────
  // Each method checks userHandlers first (custom user logic e.g. WebSocket
  // for rename, custom API for write, etc.) then falls back to REST fetch.

  async read(path: string): Promise<Uint8Array> {
    if (this.userHandlers.read) return this.userHandlers.read(path);
    const res = await this.fetchRaw("read", path);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    if (this.userHandlers.write) return this.userHandlers.write(path, data);
    await this.fetchRaw("write", path, { body: data as unknown as BodyInit });
  }

  async delete(path: string, opts?: { recursive?: boolean }): Promise<void> {
    if (this.userHandlers.delete) return this.userHandlers.delete(path, opts);
    await this.fetchRaw("delete", path);
  }

  async rename(from: string, to: string): Promise<void> {
    if (this.userHandlers.rename) return this.userHandlers.rename(from, to);
    await this.fetchRaw("rename", from, {
      body: JSON.stringify({ to }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async copy(from: string, to: string): Promise<void> {
    if (this.userHandlers.copy) return this.userHandlers.copy(from, to);
    return super.copy(from, to);
  }

  async move(from: string, to: string): Promise<void> {
    if (this.userHandlers.move) return this.userHandlers.move(from, to);
    return super.move(from, to);
  }

  async list(dir: string): Promise<DirEntry[]> {
    if (this.userHandlers.list) return this.userHandlers.list(dir);
    const res = await this.fetchRaw("list", dir);
    const raw = await res.json();
    return this.config.transformers?.list
      ? this.config.transformers.list(raw)
      : (raw as DirEntry[]);
  }

  async mkdir(path: string): Promise<void> {
    if (this.userHandlers.mkdir) return this.userHandlers.mkdir(path);
    await this.fetchRaw("mkdir", path);
  }

  async exists(path: string): Promise<boolean> {
    if (this.userHandlers.exists) return this.userHandlers.exists(path);
    try {
      const { method, url } = this.resolveEndpoint("exists", path);
      const res = await fetch(url, { method, headers: await this.headers() });
      return res.ok;
    } catch {
      return false;
    }
  }

  async stat(path: string): Promise<FileStat> {
    if (this.userHandlers.stat) return this.userHandlers.stat(path);
    const res = await this.fetchRaw("stat", path);
    const raw = await res.json();
    return this.config.transformers?.stat
      ? this.config.transformers.stat(raw)
      : (raw as FileStat);
  }

  watch(glob: string, cb: WatchCallback): IDisposable {
    if (this.userHandlers.watch) return this.userHandlers.watch(glob, cb);
    const mode = this.config.watch?.mode ?? "poll";

    if (mode === "sse" && this.config.watch?.url) {
      return this.watchViaSSE(glob, cb);
    }
    if (mode === "websocket" && this.config.watch?.url) {
      return this.watchViaWS(glob, cb);
    }
    return this.watchViaPoll(glob, cb);
  }

  private watchViaPoll(glob: string, cb: WatchCallback): IDisposable {
    const watcher = new PollingWatcher(this, glob, cb, this.config.watch?.pollInterval ?? 3000);
    watcher.start();
    return watcher;
  }

  private watchViaSSE(glob: string, cb: WatchCallback): IDisposable {
    const es = new EventSource(this.config.watch!.url!);
    es.onmessage = (event: MessageEvent) => {
      const msg = JSON.parse(event.data as string) as {
        path: string;
        changeType: "modify" | "create" | "delete";
      };
      if (matchGlob(glob, msg.path)) {
        cb({ path: msg.path, changeType: msg.changeType });
      }
    };
    return { dispose: () => es.close() };
  }

  private watchViaWS(glob: string, cb: WatchCallback): IDisposable {
    const ws = new WebSocket(this.config.watch!.url!);
    ws.onmessage = (event: MessageEvent) => {
      const msg = JSON.parse(event.data as string) as {
        path: string;
        changeType: "modify" | "create" | "delete";
      };
      if (matchGlob(glob, msg.path)) {
        cb({ path: msg.path, changeType: msg.changeType });
      }
    };
    return { dispose: () => ws.close() };
  }

  dispose(): void {
    // No persistent connections to clean up
  }
}
