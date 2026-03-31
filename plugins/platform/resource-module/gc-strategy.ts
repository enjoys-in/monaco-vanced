// ── Resource Module — GCStrategy ──────────────────────────────

import { ResourceRegistry } from "./registry";

export class GCStrategy {
  private readonly registry: ResourceRegistry;
  private readonly maxAgeMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(registry: ResourceRegistry, maxAgeMs = 300_000) {
    this.registry = registry;
    this.maxAgeMs = maxAgeMs;
  }

  idleCleanup(): string[] {
    const now = Date.now();
    const cleaned: string[] = [];

    for (const entry of this.registry.getAll()) {
      if (entry.refCount <= 0 && now - entry.createdAt > this.maxAgeMs) {
        this.registry.dispose(entry.key);
        cleaned.push(entry.key);
      }
    }

    return cleaned;
  }

  ageBasedEviction(maxAgeMs?: number): string[] {
    const threshold = maxAgeMs ?? this.maxAgeMs;
    const now = Date.now();
    const evicted: string[] = [];

    for (const entry of this.registry.getAll()) {
      if (now - entry.createdAt > threshold) {
        this.registry.dispose(entry.key);
        evicted.push(entry.key);
      }
    }

    return evicted;
  }

  memoryPressureResponse(): string[] {
    // Aggressive cleanup: dispose all zero-ref entries
    const cleaned: string[] = [];
    for (const entry of this.registry.getAll()) {
      if (entry.refCount <= 0) {
        this.registry.dispose(entry.key);
        cleaned.push(entry.key);
      }
    }
    return cleaned;
  }

  startIdleCollection(intervalMs = 60_000): void {
    this.stopIdleCollection();
    if (typeof requestIdleCallback !== "undefined") {
      const run = () => {
        requestIdleCallback(() => {
          this.idleCleanup();
          this.timer = setTimeout(run, intervalMs) as unknown as ReturnType<typeof setInterval>;
        });
      };
      run();
    } else {
      this.timer = setInterval(() => this.idleCleanup(), intervalMs);
    }
  }

  stopIdleCollection(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
