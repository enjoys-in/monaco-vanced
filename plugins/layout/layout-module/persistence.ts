// ── Layout Persistence ─────────────────────────────────────
// Save/restore layout state using storage events.

import type { LayoutState } from "./types";

const DEFAULT_KEY = "monaco-vanced:layout-state";

export class LayoutPersistence {
  private storageKey: string;

  constructor(storageKey?: string) {
    this.storageKey = storageKey ?? DEFAULT_KEY;
  }

  save(state: LayoutState): void {
    try {
      const serialized = JSON.stringify(state);
      localStorage.setItem(this.storageKey, serialized);
    } catch {
      // localStorage may be unavailable in some contexts
    }
  }

  restore(): LayoutState | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as LayoutState;
    } catch {
      return null;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // ignore
    }
  }
}
