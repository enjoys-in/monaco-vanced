// ── Dialog Module — Quick Pick ─────────────────────────────────

import type { QuickPickItem, QuickPickOptions } from "./types";

export class QuickPick {
  private items: QuickPickItem[] = [];
  private filtered: QuickPickItem[] = [];
  private selected = new Set<string>();
  private options: QuickPickOptions = {};
  private resolvePromise: ((result: QuickPickItem | QuickPickItem[] | null) => void) | null = null;

  show(
    items: QuickPickItem[],
    options: QuickPickOptions = {},
  ): Promise<QuickPickItem | QuickPickItem[] | null> {
    this.items = items;
    this.filtered = [...items];
    this.options = options;
    this.selected.clear();

    // Pre-select items marked as picked
    for (const item of items) {
      if (item.picked) this.selected.add(item.id);
    }

    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  filter(query: string): QuickPickItem[] {
    if (!query.trim()) {
      this.filtered = [...this.items];
      return this.filtered;
    }

    const lower = query.toLowerCase();
    this.filtered = this.items.filter((item) => {
      if (item.label.toLowerCase().includes(lower)) return true;
      if (this.options.matchOnDescription && item.description?.toLowerCase().includes(lower)) return true;
      if (item.detail?.toLowerCase().includes(lower)) return true;
      // Fuzzy match on label
      return this.fuzzyMatch(item.label.toLowerCase(), lower);
    });

    return this.filtered;
  }

  select(itemId: string): void {
    if (this.options.multiSelect) {
      if (this.selected.has(itemId)) {
        this.selected.delete(itemId);
      } else {
        this.selected.add(itemId);
      }
    } else {
      this.selected.clear();
      this.selected.add(itemId);
    }
  }

  confirm(): void {
    if (!this.resolvePromise) return;

    if (this.options.multiSelect) {
      const result = this.items.filter((i) => this.selected.has(i.id));
      this.resolvePromise(result);
    } else {
      const selectedId = Array.from(this.selected)[0];
      const result = this.items.find((i) => i.id === selectedId) ?? null;
      this.resolvePromise(result);
    }
    this.resolvePromise = null;
  }

  cancel(): void {
    this.resolvePromise?.(null);
    this.resolvePromise = null;
  }

  getFiltered(): QuickPickItem[] {
    return [...this.filtered];
  }

  getSelected(): Set<string> {
    return new Set(this.selected);
  }

  isMultiSelect(): boolean {
    return this.options.multiSelect ?? false;
  }

  private fuzzyMatch(label: string, query: string): boolean {
    let qi = 0;
    for (let ci = 0; ci < label.length && qi < query.length; ci++) {
      if (label[ci] === query[qi]) qi++;
    }
    return qi === query.length;
  }
}
