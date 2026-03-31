// ── Performance Module — TTLTracker ───────────────────────────

interface TTLEntry {
  expires: number;
}

export class TTLTracker {
  private readonly entries = new Map<string, TTLEntry>();

  set(key: string, ttlMs: number): void {
    this.entries.set(key, { expires: Date.now() + ttlMs });
  }

  isExpired(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) return true;
    return Date.now() >= entry.expires;
  }

  prune(): string[] {
    const pruned: string[] = [];
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (now >= entry.expires) {
        this.entries.delete(key);
        pruned.push(key);
      }
    }
    return pruned;
  }

  remaining(key: string): number {
    const entry = this.entries.get(key);
    if (!entry) return 0;
    return Math.max(0, entry.expires - Date.now());
  }

  remove(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}
