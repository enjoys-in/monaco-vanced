// ── Store ──────────────────────────────────────────────────
// Persistent storage backend for AI memory (localStorage).

export class PersistentStore<T> {
  private data: T[] = [];
  private key: string;
  private maxItems: number;

  constructor(key: string, maxItems = 200) {
    this.key = key;
    this.maxItems = maxItems;
    this.restore();
  }

  add(item: T): void {
    this.data.push(item);
    this.enforceLimit();
    this.persist();
  }

  update(predicate: (item: T) => boolean, updater: (item: T) => T): void {
    this.data = this.data.map((item) => (predicate(item) ? updater(item) : item));
    this.persist();
  }

  getAll(): T[] {
    return [...this.data];
  }

  find(predicate: (item: T) => boolean): T | undefined {
    return this.data.find(predicate);
  }

  filter(predicate: (item: T) => boolean): T[] {
    return this.data.filter(predicate);
  }

  remove(predicate: (item: T) => boolean): void {
    this.data = this.data.filter((item) => !predicate(item));
    this.persist();
  }

  clear(): void {
    this.data = [];
    this.persist();
  }

  get size(): number {
    return this.data.length;
  }

  private enforceLimit(): void {
    if (this.data.length > this.maxItems) {
      this.data = this.data.slice(-this.maxItems);
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.data));
    } catch {
      // ignore
    }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return;
      this.data = JSON.parse(raw) as T[];
    } catch {
      // ignore
    }
  }
}
