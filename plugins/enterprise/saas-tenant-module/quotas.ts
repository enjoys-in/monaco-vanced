// ── Tenant Quota Manager ───────────────────────────────────

export interface TenantQuota {
  feature: string;
  limit: number;
  current: number;
}

export class TenantQuotaManager {
  // tenantId → feature → quota
  private readonly quotas = new Map<string, Map<string, TenantQuota>>();

  setQuota(tenantId: string, feature: string, limit: number): void {
    let tenantQuotas = this.quotas.get(tenantId);
    if (!tenantQuotas) {
      tenantQuotas = new Map();
      this.quotas.set(tenantId, tenantQuotas);
    }
    const existing = tenantQuotas.get(feature);
    tenantQuotas.set(feature, {
      feature,
      limit,
      current: existing?.current ?? 0,
    });
  }

  getQuota(tenantId: string, feature: string): TenantQuota | null {
    return this.quotas.get(tenantId)?.get(feature) ?? null;
  }

  incrementUsage(tenantId: string, feature: string, amount = 1): void {
    const quota = this.quotas.get(tenantId)?.get(feature);
    if (quota) {
      quota.current += amount;
    }
  }

  enforceQuota(tenantId: string, feature: string): void {
    const quota = this.getQuota(tenantId, feature);
    if (quota && quota.current >= quota.limit) {
      throw new Error(
        `Tenant "${tenantId}" exceeded quota for "${feature}": ${quota.current}/${quota.limit}`,
      );
    }
  }

  getAllQuotas(tenantId: string): TenantQuota[] {
    const tenantQuotas = this.quotas.get(tenantId);
    return tenantQuotas ? [...tenantQuotas.values()] : [];
  }

  resetQuota(tenantId: string, feature: string): void {
    const quota = this.quotas.get(tenantId)?.get(feature);
    if (quota) {
      quota.current = 0;
    }
  }
}
