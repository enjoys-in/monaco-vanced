// ── Quota Manager ──────────────────────────────────────────

import type { Quota, QuotaCheckResult } from "./types";

export class QuotaManager {
  private readonly quotas = new Map<string, Quota>();

  setQuotas(quotas: Quota[]): void {
    for (const q of quotas) {
      this.quotas.set(q.feature, { ...q });
    }
  }

  updateUsage(feature: string, current: number): void {
    const quota = this.quotas.get(feature);
    if (quota) {
      quota.current = current;
    }
  }

  check(feature: string): QuotaCheckResult {
    const quota = this.quotas.get(feature);
    if (!quota) return { allowed: true, remaining: Infinity, limit: Infinity };
    const remaining = Math.max(0, quota.limit - quota.current);
    return { allowed: remaining > 0, remaining, limit: quota.limit };
  }

  enforce(feature: string): void {
    const result = this.check(feature);
    if (!result.allowed) {
      throw new Error(`Quota exceeded for "${feature}": ${result.remaining}/${result.limit}`);
    }
  }

  getAll(): Quota[] {
    return [...this.quotas.values()];
  }
}
