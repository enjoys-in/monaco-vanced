// ── Navigation History ─────────────────────────────────────
// Forward/back navigation stack similar to browser history.

import type { NavigationEntry } from "./types";

export class NavigationHistory {
  private stack: NavigationEntry[] = [];
  private cursor = -1;
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  push(entry: Omit<NavigationEntry, "timestamp">): void {
    // Trim forward history when pushing a new entry
    if (this.cursor < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.cursor + 1);
    }

    const nav: NavigationEntry = {
      ...entry,
      timestamp: Date.now(),
    };
    this.stack.push(nav);
    this.cursor = this.stack.length - 1;

    // Enforce max size
    if (this.stack.length > this.maxSize) {
      const overflow = this.stack.length - this.maxSize;
      this.stack = this.stack.slice(overflow);
      this.cursor = Math.max(0, this.cursor - overflow);
    }
  }

  goBack(): NavigationEntry | null {
    if (!this.canGoBack()) return null;
    this.cursor--;
    return this.stack[this.cursor] ?? null;
  }

  goForward(): NavigationEntry | null {
    if (!this.canGoForward()) return null;
    this.cursor++;
    return this.stack[this.cursor] ?? null;
  }

  canGoBack(): boolean {
    return this.cursor > 0;
  }

  canGoForward(): boolean {
    return this.cursor < this.stack.length - 1;
  }

  getCurrent(): NavigationEntry | null {
    return this.stack[this.cursor] ?? null;
  }

  getAll(): NavigationEntry[] {
    return [...this.stack];
  }

  clear(): void {
    this.stack = [];
    this.cursor = -1;
  }

  dispose(): void {
    this.clear();
  }
}
