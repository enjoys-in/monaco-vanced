// ── Billing Module Types ───────────────────────────────────

export interface MeterEvent {
  feature: string;
  quantity: number;
  timestamp: number;
  tenantId?: string;
}

export interface Quota {
  feature: string;
  limit: number;
  current: number;
  resetAt?: number;
}

export interface BillingPlan {
  id: string;
  name: string;
  quotas: Quota[];
}

export interface BillingConfig {
  plan?: BillingPlan;
  metering?: boolean;
}

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

export interface BillingModuleAPI {
  meter(feature: string, qty?: number): void;
  getUsage(feature: string): number;
  checkQuota(feature: string): QuotaCheckResult;
  getPlan(): BillingPlan | null;
  setPlan(plan: BillingPlan): void;
  getQuotas(): Quota[];
}
