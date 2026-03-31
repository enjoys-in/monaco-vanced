// ── Virtualization-module types ─────────────────────────────

export interface VirtualListConfig {
  /** Container element */
  container: HTMLElement;
  /** Total number of items */
  itemCount: number;
  /** Fixed item height in pixels, or function for variable heights */
  itemHeight: number | ((index: number) => number);
  /** Render function — returns a DOM element for the given index */
  renderItem: (index: number) => HTMLElement;
  /** Extra items rendered above/below viewport (default: 5) */
  overscan?: number;
  /** Unique list identifier */
  id?: string;
}

export interface VirtualHandle {
  /** Scroll to a specific item index */
  scrollToIndex(index: number, align?: "start" | "center" | "end"): void;
  /** Update the total item count (e.g. after data change) */
  setItemCount(count: number): void;
  /** Force re-render of visible items */
  refresh(): void;
  /** Get currently visible index range */
  getVisibleRange(): { start: number; end: number };
  /** Clean up resources */
  dispose(): void;
}

export interface VirtualScrollState {
  scrollTop: number;
  startIndex: number;
  endIndex: number;
  visibleCount: number;
}
