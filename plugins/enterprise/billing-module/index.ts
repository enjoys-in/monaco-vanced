// ── Billing Module ─────────────────────────────────────────

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { BillingConfig, BillingModuleAPI, BillingPlan, MeterEvent, Quota, QuotaCheckResult } from "./types";
import { MeteringEngine } from "./metering";
import { BillingProvider } from "./provider";
import { QuotaManager } from "./quotas";

export type { BillingConfig, BillingModuleAPI, BillingPlan, MeterEvent, Quota, QuotaCheckResult };
export { MeteringEngine, BillingProvider, QuotaManager };

export function createBillingPlugin(
  config: BillingConfig = {},
): { plugin: MonacoPlugin; api: BillingModuleAPI } {
  const metering = new MeteringEngine();
  const quotaManager = new QuotaManager();
  let plan: BillingPlan | null = config.plan ?? null;

  if (plan) {
    quotaManager.setQuotas(plan.quotas);
  }

  let ctx: PluginContext | null = null;

  const api: BillingModuleAPI = {
    meter(feature: string, qty = 1): void {
      const check = quotaManager.check(feature);
      metering.record(feature, qty);
      quotaManager.updateUsage(feature, metering.getUsage(feature));

      ctx?.emit("billing:meter", { feature, qty });

      if (check.allowed && !quotaManager.check(feature).allowed) {
        ctx?.emit("billing:quota-exceeded", { feature });
      }
    },

    getUsage(feature: string): number {
      return metering.getUsage(feature);
    },

    checkQuota(feature: string): QuotaCheckResult {
      return quotaManager.check(feature);
    },

    getPlan(): BillingPlan | null {
      return plan;
    },

    setPlan(newPlan: BillingPlan): void {
      plan = newPlan;
      quotaManager.setQuotas(newPlan.quotas);
    },

    getQuotas(): Quota[] {
      return quotaManager.getAll();
    },
  };

  const plugin: MonacoPlugin = {
    id: "billing-module",
    name: "Billing Module",
    version: "1.0.0",
    description: "Usage metering, quota enforcement, and billing plan management",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;
    },

    onDispose(): void {
      ctx = null;
    },
  };

  return { plugin, api };
}
