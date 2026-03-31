// ── FS Module — OPFS Adapter ──────────────────────────────────
// Origin Private File System — fast, sandboxed, same-origin storage.
// See context/fs-connections.txt Section 5d

import type { IDisposable } from "@core/types";
import type {
  AdapterCapabilities,
  DirEntry,
  FileStat,
  OPFSAdapterConfig,
  WatchCallback,
} from "../types";
import { BaseAdapter, joinPath } from "../adapter";
import { PollingWatcher } from "../watcher";

/**
 * OPFS adapter — uses `navigator.storage.getDirectory()` for a
 * sandboxed, fast file system. No user prompts required.
 * Streaming is false because OPFS uses sync access handles for perf.
 */
export class OPFSAdapter extends BaseAdapter {
  readonly name = "opfs";
  readonly type = "local" as const;
  readonly capabilities: AdapterCapabilities = {
    indexing: true,
    watch: true,
    search: true,
    streaming: false,
    vectorIndex: true,
    symbolGraph: true,
  };

  private root: FileSystemDirectoryHandle | null = null;
  private rootDir: string;

  constructor(private config: OPFSAdapterConfig) {
    super();
    this.rootDir = (config.rootDir ?? "").replace(/\/+$/, "");
  }

  async init(): Promise<void> {
    const storageRoot = await navigator.storage.getDirectory();
    if (this.rootDir) {
      // Create a sub-directory to namespace this adapter
      this.root = await storageRoot.getDirectoryHandle(this.rootDir, { create: true });
    } else {
      this.root = storageRoot;
    }
  }

  private getRoot(): FileSystemDirectoryHandle {
    if (!this.root) throw new Error("OPFS adapter not initialized. Call init() first.");
    return this.root;
  }

  private splitPath(path: string): string[] {
    return path.split("/").filter(Boolean);
  }

  private async resolveDir(path: string): Promise<FileSystemDirectoryHandle> {
    let dir = this.getRoot();
    for (const part of this.splitPath(path)) {
      dir = await dir.getDirectoryHandle(part);
    }
    return dir;
  }

  private async resolveParent(path: string): Promise<{ parent: FileSystemDirectoryHandle; name: string }> {
    const parts = this.splitPath(path);
    const name = parts.pop()!;
    let parent = this.getRoot();
    for (const part of parts) {
      parent = await parent.getDirectoryHandle(part);
    }
    return { parent, name };
  }

  // ───── FSAdapter interface ─────

  async read(path: string): Promise<Uint8Array> {
    const { parent, name } = await this.resolveParent(path);
    const fh = await parent.getFileHandle(name);
    const file = await fh.getFile();
    const buf = await file.arrayBuffer();
    return new Uint8Array(buf);
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    const { parent, name } = await this.resolveParent(path);
    const fh = await parent.getFileHandle(name, { create: true });
    const writable = await fh.createWritable();
    await writable.write(data as unknown as FileSystemWriteChunkType);
    await writable.close();
  }

  async delete(path: string, opts?: { recursive?: boolean }): Promise<void> {
    const { parent, name } = await this.resolveParent(path);
    await parent.removeEntry(name, { recursive: opts?.recursive });
  }

  async rename(from: string, to: string): Promise<void> {
    // OPFS doesn't have native rename across directories — copy + delete
    const data = await this.read(from);
    await this.write(to, data);
    await this.delete(from);
  }

  async list(dir: string): Promise<DirEntry[]> {
    const dirHandle = await this.resolveDir(dir);
    const entries: DirEntry[] = [];
    for await (const [name, handle] of (dirHandle as unknown as AsyncIterable<[string, FileSystemHandle]>)) {
      const isDir = handle.kind === "directory";
      const entryPath = joinPath(dir, name);
      let size = 0;
      let modified = 0;
      if (!isDir) {
        try {
          const file = await (handle as FileSystemFileHandle).getFile();
          size = file.size;
          modified = file.lastModified;
        } catch {
          // noop
        }
      }
      entries.push({ name, path: entryPath, isDirectory: isDir, size, modified });
    }
    return entries;
  }

  async mkdir(path: string): Promise<void> {
    const parts = this.splitPath(path);
    let dir = this.getRoot();
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create: true });
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      const { parent, name } = await this.resolveParent(path);
      try {
        await parent.getFileHandle(name);
        return true;
      } catch {
        await parent.getDirectoryHandle(name);
        return true;
      }
    } catch {
      return false;
    }
  }

  async stat(path: string): Promise<FileStat> {
    const { parent, name } = await this.resolveParent(path);
    try {
      const fh = await parent.getFileHandle(name);
      const file = await fh.getFile();
      return {
        size: file.size,
        modified: file.lastModified,
        created: file.lastModified,
        isDirectory: false,
      };
    } catch {
      await parent.getDirectoryHandle(name);
      return { size: 0, modified: 0, created: 0, isDirectory: true };
    }
  }

  watch(glob: string, cb: WatchCallback): IDisposable {
    const watcher = new PollingWatcher(this, glob, cb, this.config.pollInterval ?? 2000);
    watcher.start();
    return watcher;
  }

  dispose(): void {
    this.root = null;
  }
}
