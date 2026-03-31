// ── Feature Flags Module — RemoteFlagSync ─────────────────────

import type { FlagValue } from "./types";

export class RemoteFlagSync {
  private readonly url: string | null;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(url?: string) {
    this.url = url ?? null;
  }

  async fetch(): Promise<Map<string, FlagValue>> {
    if (!this.url) return new Map();

    const res = await fetch(this.url);
    if (!res.ok) {
      throw new Error(`Remote flag fetch failed: ${res.status}`);
    }

    const data = (await res.json()) as Record<string, FlagValue>;
    const result = new Map<string, FlagValue>();
    for (const [k, v] of Object.entries(data)) {
      result.set(k, v);
    }
    return result;
  }

  startPeriodicRefresh(intervalMs: number, callback: (flags: Map<string, FlagValue>) => void): void {
    this.stopPeriodicRefresh();
    this.timer = setInterval(async () => {
      try {
        const flags = await this.fetch();
        callback(flags);
      } catch (e) {
        console.warn("[remote-flags] Refresh failed:", e);
      }
    }, intervalMs);
  }

  stopPeriodicRefresh(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
