// ── FS Module — Local Adapter ─────────────────────────────────
// Local adapter: File System Access API (browser) or direct FS (Electron).
// See context/fs-connections.txt Section 5c

import type { IDisposable } from "@core/types";
import type {
  AdapterCapabilities,
  DirEntry,
  FileStat,
  LocalAdapterConfig,
  WatchCallback,
} from "../types";
import { BaseAdapter, joinPath } from "../adapter";
import { PollingWatcher } from "../watcher";

/**
 * Local adapter — wraps the File System Access API for browser and
 * falls back to Node fs for Electron main-process access.
 * Full capabilities: indexing, watch, search, streaming, vectorIndex, symbolGraph.
 */
export class LocalAdapter extends BaseAdapter {
  readonly name = "local";
  readonly type = "local" as const;
  readonly capabilities: AdapterCapabilities = {
    indexing: true,
    watch: true,
    search: true,
    streaming: true,
    vectorIndex: true,
    symbolGraph: true,
  };

  private root: FileSystemDirectoryHandle | null = null;

  constructor(private config: LocalAdapterConfig) {
    super();
  }

  /** Initialize — prompt user if no handle provided */
  async init(): Promise<void> {
    if (this.config.rootHandle) {
      this.root = this.config.rootHandle;
    } else if ("showDirectoryPicker" in globalThis) {
      this.root = await (globalThis as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
    } else {
      throw new Error("Local adapter requires File System Access API or a rootDirHandle");
    }
  }

  // ───── Navigation helpers ─────

  private getRoot(): FileSystemDirectoryHandle {
    if (!this.root) throw new Error("Local adapter not initialized. Call init() first.");
    return this.root;
  }

  private splitPath(path: string): string[] {
    return path.split("/").filter(Boolean);
  }

  /** Resolve a directory handle for the given path */
  private async resolveDir(path: string): Promise<FileSystemDirectoryHandle> {
    let dir = this.getRoot();
    for (const part of this.splitPath(path)) {
      dir = await dir.getDirectoryHandle(part);
    }
    return dir;
  }

  /** Resolve parent dir + entry name */
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
    const fileHandle = await parent.getFileHandle(name);
    const file = await fileHandle.getFile();
    const buf = await file.arrayBuffer();
    return new Uint8Array(buf);
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    const { parent, name } = await this.resolveParent(path);
    const fileHandle = await parent.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data as unknown as FileSystemWriteChunkType);
    await writable.close();
  }

  async delete(path: string, opts?: { recursive?: boolean }): Promise<void> {
    const { parent, name } = await this.resolveParent(path);
    await parent.removeEntry(name, { recursive: opts?.recursive });
  }

  async rename(from: string, to: string): Promise<void> {
    // File System Access API lacks native rename — copy + delete
    await this.copy(from, to);
    await this.delete(from);
  }

  async copy(from: string, to: string): Promise<void> {
    const data = await this.read(from);
    await this.write(to, data);
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
          // Permission denied or gone
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

    // Try file first
    try {
      const fh = await parent.getFileHandle(name);
      const file = await fh.getFile();
      return {
        size: file.size,
        modified: file.lastModified,
        created: file.lastModified, // File API doesn't expose creation time
        isDirectory: false,
      };
    } catch {
      // Not a file — check directory
      await parent.getDirectoryHandle(name);
      return {
        size: 0,
        modified: 0,
        created: 0,
        isDirectory: true,
      };
    }
  }

  watch(glob: string, cb: WatchCallback): IDisposable {
    // File System Access API has no native watch — use polling
    const watcher = new PollingWatcher(this, glob, cb, this.config.pollInterval ?? 2000);
    watcher.start();
    return watcher;
  }

  dispose(): void {
    this.root = null;
  }
}
