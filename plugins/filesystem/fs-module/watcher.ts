// ── FS Module — File Watcher (Polling) ────────────────────────
// Provides a polling-based file watcher for adapters without native watch.

import type { IDisposable } from "@core/types";
import type { FSAdapter, WatchCallback, WatchChangeType } from "./types";
import { matchGlob } from "./adapter";

interface WatchEntry {
  path: string;
  modified: number;
  size: number;
}

/**
 * Polling file watcher — periodically lists directory contents and
 * diffs against a snapshot to detect create/modify/delete changes.
 * Used by SFTP, OPFS, and IndexedDB adapters (no native watch).
 */
export class PollingWatcher implements IDisposable {
  private timer: ReturnType<typeof setInterval> | null = null;
  private snapshot = new Map<string, WatchEntry>();
  private disposed = false;

  constructor(
    private adapter: FSAdapter,
    private glob: string,
    private callback: WatchCallback,
    private intervalMs: number = 2000,
  ) {}

  /** Start the polling loop */
  start(): void {
    if (this.disposed) return;

    // Initial snapshot
    this.poll().catch(() => {});

    this.timer = setInterval(() => {
      this.poll().catch(() => {});
    }, this.intervalMs);
  }

  private async poll(): Promise<void> {
    if (this.disposed) return;

    const dir = this.extractRootDir();
    let entries: WatchEntry[];

    try {
      const dirEntries = await this.adapter.list(dir);
      entries = dirEntries
        .filter((e) => matchGlob(this.glob, e.path))
        .map((e) => ({ path: e.path, modified: e.modified, size: e.size }));
    } catch {
      return; // Directory might not exist yet
    }

    const currentPaths = new Set<string>();

    for (const entry of entries) {
      currentPaths.add(entry.path);

      const existing = this.snapshot.get(entry.path);
      if (!existing) {
        // New file
        if (this.snapshot.size > 0) {
          // Only emit creates after initial scan
          this.emit(entry.path, "create");
        }
      } else if (existing.modified !== entry.modified || existing.size !== entry.size) {
        this.emit(entry.path, "modify");
      }

      this.snapshot.set(entry.path, entry);
    }

    // Detect deletes
    for (const [path] of this.snapshot) {
      if (!currentPaths.has(path)) {
        this.emit(path, "delete");
        this.snapshot.delete(path);
      }
    }
  }

  private emit(path: string, changeType: WatchChangeType): void {
    try {
      this.callback({ path, changeType });
    } catch {
      // callback errors must not break the poll loop
    }
  }

  /** Extract root directory from glob (e.g. "/src/**" → "/src") */
  private extractRootDir(): string {
    const idx = this.glob.indexOf("*");
    if (idx === -1) return this.glob;
    const prefix = this.glob.substring(0, idx);
    return prefix.replace(/\/+$/, "") || "/";
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.snapshot.clear();
  }
}
