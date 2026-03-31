// ── Shim Layer ─────────────────────────────────────────────

import type { Shim } from "./types";

export class ShimLayer {
  private readonly shims = new Map<string, Shim>();
  private readonly usageCounts = new Map<string, number>();

  register(shim: Shim): void {
    this.shims.set(shim.api, shim);
    this.usageCounts.set(shim.api, 0);
  }

  remove(api: string): void {
    this.shims.delete(api);
    this.usageCounts.delete(api);
  }

  call(api: string, ...args: unknown[]): unknown {
    const shim = this.shims.get(api);
    if (!shim) {
      throw new Error(`No shim registered for API "${api}"`);
    }

    if (shim.expires && Date.now() > new Date(shim.expires).getTime()) {
      this.shims.delete(api);
      throw new Error(`Shim for "${api}" has expired (${shim.expires})`);
    }

    const count = (this.usageCounts.get(api) ?? 0) + 1;
    this.usageCounts.set(api, count);

    console.warn(`[Shim] Proxying deprecated API "${api}" (usage #${count})`);
    return shim.handler(...args);
  }

  has(api: string): boolean {
    return this.shims.has(api);
  }

  getUsageCount(api: string): number {
    return this.usageCounts.get(api) ?? 0;
  }

  getAll(): Shim[] {
    return [...this.shims.values()];
  }
}
