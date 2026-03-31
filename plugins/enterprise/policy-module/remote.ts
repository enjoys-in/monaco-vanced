// ── Remote Policy Sync ─────────────────────────────────────

import type { Policy } from "./types";

export class RemotePolicySync {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  async fetch(url: string): Promise<Policy[]> {
    try {
      const resp = await globalThis.fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!resp.ok) throw new Error(`Policy fetch failed: ${resp.status}`);
      const data = (await resp.json()) as { policies: Policy[] } | Policy[];
      return Array.isArray(data) ? data : data.policies;
    } catch (err) {
      console.error("[Policy] Remote sync failed:", err);
      return [];
    }
  }

  startPeriodicRefresh(
    url: string,
    intervalMs: number,
    onPolicies: (policies: Policy[]) => void,
  ): void {
    this.stopPeriodicRefresh();
    this.intervalId = setInterval(async () => {
      const policies = await this.fetch(url);
      if (policies.length > 0) {
        onPolicies(policies);
      }
    }, intervalMs);
  }

  stopPeriodicRefresh(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
