// ── Context Storage ────────────────────────────────────────

export class ContextStorage {
  private readonly store = new Map<string, unknown>();

  set(key: string, data: unknown): void {
    this.store.set(key, data);
  }

  get<T = unknown>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  keys(): string[] {
    return [...this.store.keys()];
  }

  size(): number {
    return this.store.size;
  }
}
