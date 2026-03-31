// ── Settings Module — Watcher ──────────────────────────────────

import type { IDisposable } from "@core/types";
import type { SettingsChangeEvent } from "./types";

export class SettingsWatcher {
  private readonly keyHandlers = new Map<string, Array<(event: SettingsChangeEvent) => void>>();
  private readonly allHandlers: Array<(event: SettingsChangeEvent) => void> = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingChanges: SettingsChangeEvent[] = [];
  private readonly debounceMs: number;

  constructor(debounceMs = 50) {
    this.debounceMs = debounceMs;
  }

  watch(key: string, handler: (event: SettingsChangeEvent) => void): IDisposable {
    if (!this.keyHandlers.has(key)) {
      this.keyHandlers.set(key, []);
    }
    this.keyHandlers.get(key)!.push(handler);
    return {
      dispose: () => {
        const handlers = this.keyHandlers.get(key);
        if (handlers) {
          const idx = handlers.indexOf(handler);
          if (idx >= 0) handlers.splice(idx, 1);
          if (handlers.length === 0) this.keyHandlers.delete(key);
        }
      },
    };
  }

  watchAll(handler: (event: SettingsChangeEvent) => void): IDisposable {
    this.allHandlers.push(handler);
    return {
      dispose: () => {
        const idx = this.allHandlers.indexOf(handler);
        if (idx >= 0) this.allHandlers.splice(idx, 1);
      },
    };
  }

  notify(event: SettingsChangeEvent): void {
    this.pendingChanges.push(event);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.flush(), this.debounceMs);
  }

  private flush(): void {
    const changes = [...this.pendingChanges];
    this.pendingChanges.length = 0;
    this.debounceTimer = null;

    for (const event of changes) {
      // Key-specific handlers
      const handlers = this.keyHandlers.get(event.key);
      if (handlers) {
        for (const h of handlers) {
          try { h(event); } catch (e) { console.warn("[settings-watcher] handler error:", e); }
        }
      }
      // All-change handlers
      for (const h of this.allHandlers) {
        try { h(event); } catch (e) { console.warn("[settings-watcher] handler error:", e); }
      }
    }
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.keyHandlers.clear();
    this.allHandlers.length = 0;
    this.pendingChanges.length = 0;
  }
}
