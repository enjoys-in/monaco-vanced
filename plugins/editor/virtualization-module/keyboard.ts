// ── Keyboard navigation for virtualized lists ──────────────
// Arrow keys, page up/down, home/end.

import type { VirtualHandle } from "./types";

export interface KeyboardNavConfig {
  /** The virtual list handle */
  list: VirtualHandle;
  /** Total item count */
  itemCount: number;
  /** Container element to attach key listeners to */
  container: HTMLElement;
  /** Called when the focused index changes */
  onFocusChange?: (index: number) => void;
  /** Items visible per page (for page up/down) */
  pageSize?: number;
}

export class KeyboardNavigator {
  private focusedIndex = 0;
  private config: KeyboardNavConfig;
  private handler: (e: KeyboardEvent) => void;

  constructor(config: KeyboardNavConfig) {
    this.config = config;
    this.handler = this.onKeyDown.bind(this);
    config.container.addEventListener("keydown", this.handler);
    // Make container focusable
    if (!config.container.hasAttribute("tabindex")) {
      config.container.setAttribute("tabindex", "0");
    }
  }

  getFocusedIndex(): number {
    return this.focusedIndex;
  }

  setFocusedIndex(index: number): void {
    this.focusedIndex = this.clamp(index);
    this.config.list.scrollToIndex(this.focusedIndex, "center");
    this.config.onFocusChange?.(this.focusedIndex);
  }

  private onKeyDown(e: KeyboardEvent): void {
    const { itemCount } = this.config;
    const pageSize = this.config.pageSize ?? 10;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        this.setFocusedIndex(this.focusedIndex + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        this.setFocusedIndex(this.focusedIndex - 1);
        break;
      case "PageDown":
        e.preventDefault();
        this.setFocusedIndex(this.focusedIndex + pageSize);
        break;
      case "PageUp":
        e.preventDefault();
        this.setFocusedIndex(this.focusedIndex - pageSize);
        break;
      case "Home":
        e.preventDefault();
        this.setFocusedIndex(0);
        break;
      case "End":
        e.preventDefault();
        this.setFocusedIndex(itemCount - 1);
        break;
    }
  }

  private clamp(index: number): number {
    return Math.max(0, Math.min(index, this.config.itemCount - 1));
  }

  dispose(): void {
    this.config.container.removeEventListener("keydown", this.handler);
  }
}
