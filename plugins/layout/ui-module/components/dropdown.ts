// ── Dropdown Component Logic ───────────────────────────────
// Headless dropdown state management.

import type { DropdownConfig, DropdownOption } from "../types";

export class DropdownState {
  private options: DropdownOption[];
  private selectedId: string | null;
  private isOpen = false;
  private focusedIndex = -1;

  constructor(config: DropdownConfig) {
    this.options = config.options;
    this.selectedId = config.selectedId ?? null;
  }

  open(): void {
    this.isOpen = true;
    this.focusedIndex = this.options.findIndex((o) => o.id === this.selectedId);
  }

  close(): void {
    this.isOpen = false;
    this.focusedIndex = -1;
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  select(id: string): DropdownOption | undefined {
    const option = this.options.find((o) => o.id === id && !o.disabled);
    if (option) {
      this.selectedId = id;
      this.close();
    }
    return option;
  }

  focusNext(): void {
    const nextIdx = this.findNextFocusable(this.focusedIndex, 1);
    if (nextIdx >= 0) this.focusedIndex = nextIdx;
  }

  focusPrev(): void {
    const prevIdx = this.findNextFocusable(this.focusedIndex, -1);
    if (prevIdx >= 0) this.focusedIndex = prevIdx;
  }

  private findNextFocusable(fromIndex: number, direction: 1 | -1): number {
    let idx = fromIndex + direction;
    while (idx >= 0 && idx < this.options.length) {
      const opt = this.options[idx]!;
      if (!opt.disabled && !opt.separator) return idx;
      idx += direction;
    }
    return -1;
  }

  getState() {
    return {
      options: this.options,
      selectedId: this.selectedId,
      isOpen: this.isOpen,
      focusedIndex: this.focusedIndex,
      selectedOption: this.options.find((o) => o.id === this.selectedId) ?? null,
    };
  }

  setOptions(options: DropdownOption[]): void {
    this.options = options;
  }
}
