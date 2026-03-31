// ── FS Module — Abstract Base Adapter ─────────────────────────
// Provides default implementations and helpers for FSAdapter.

import type { IDisposable } from "@core/types";
import type {
  FSAdapter,
  AdapterType,
  AdapterCapabilities,
  DirEntry,
  FileStat,
  WatchCallback,
} from "./types";

/**
 * Abstract base class for FS adapters. Concrete adapters extend this
 * and override the methods they support. Provides default no-op watch
 * and sensible error messages for unimplemented operations.
 */
export abstract class BaseAdapter implements FSAdapter {
  abstract readonly name: string;
  abstract readonly type: AdapterType;
  abstract readonly capabilities: AdapterCapabilities;

  abstract read(path: string): Promise<Uint8Array>;
  abstract write(path: string, data: Uint8Array): Promise<void>;
  abstract delete(path: string, opts?: { recursive?: boolean }): Promise<void>;
  abstract rename(from: string, to: string): Promise<void>;
  abstract list(dir: string): Promise<DirEntry[]>;
  abstract mkdir(path: string, opts?: { recursive?: boolean }): Promise<void>;
  abstract exists(path: string): Promise<boolean>;
  abstract stat(path: string): Promise<FileStat>;

  async copy(from: string, to: string): Promise<void> {
    const data = await this.read(from);
    await this.write(to, data);
  }

  async move(from: string, to: string): Promise<void> {
    await this.copy(from, to);
    await this.delete(from);
  }

  watch(_glob: string, _cb: WatchCallback): IDisposable {
    return { dispose: () => {} };
  }

  async init(): Promise<void> {}
  dispose(): void {}
}

// ── Utility helpers ──────────────────────────────────────────

/** Extract the parent directory path from a file path */
export function parentDir(filePath: string): string {
  const parts = filePath.replace(/\/+$/, "").split("/");
  parts.pop();
  return parts.join("/") || "/";
}

/** Extract the file/folder name from a path */
export function baseName(filePath: string): string {
  const parts = filePath.replace(/\/+$/, "").split("/");
  return parts[parts.length - 1] ?? "";
}

/** Normalize path — remove trailing slashes, collapse double slashes */
export function normalizePath(p: string): string {
  return ("/" + p).replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

/** Join path segments */
export function joinPath(...segments: string[]): string {
  return normalizePath(segments.join("/"));
}

/** Check if a path matches a simple glob pattern (supports * and **) */
export function matchGlob(pattern: string, filePath: string): boolean {
  const regex = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "⚝")
    .replace(/\*/g, "[^/]*")
    .replace(/⚝/g, ".*");
  return new RegExp(`^${regex}$`).test(filePath);
}
