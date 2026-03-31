// ── Variable height support ─────────────────────────────────
// Caches measured row heights for efficient offset calculation.

export class VariableHeightCache {
  private cache = new Map<number, number>();
  private defaultHeight: number;

  constructor(defaultHeight = 24) {
    this.defaultHeight = defaultHeight;
  }

  /** Get the height for an item, returning default if not measured */
  getHeight(index: number): number {
    return this.cache.get(index) ?? this.defaultHeight;
  }

  /** Store a measured height for an item */
  setHeight(index: number, height: number): void {
    this.cache.set(index, height);
  }

  /** Get offset from top for a given index */
  getOffset(index: number): number {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += this.getHeight(i);
    }
    return offset;
  }

  /** Get total height for a range of items */
  getTotalHeight(itemCount: number): number {
    return this.getOffset(itemCount);
  }

  /** Find the item index at a given scroll offset */
  getIndexAtOffset(offset: number, itemCount: number): number {
    let accum = 0;
    for (let i = 0; i < itemCount; i++) {
      accum += this.getHeight(i);
      if (accum > offset) return i;
    }
    return Math.max(0, itemCount - 1);
  }

  /** Creates an itemHeight function compatible with VirtualListConfig */
  toItemHeight(): (index: number) => number {
    return (index) => this.getHeight(index);
  }

  /** Clear the cache (e.g. after data refresh) */
  clear(): void {
    this.cache.clear();
  }
}
