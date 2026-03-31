// ── Billing Provider ───────────────────────────────────────

import type { BillingPlan, MeterEvent } from "./types";

export interface BillingProviderConfig {
  apiUrl?: string;
  apiKey?: string;
}

export class BillingProvider {
  private readonly config: BillingProviderConfig;

  constructor(config: BillingProviderConfig = {}) {
    this.config = config;
  }

  async reportUsage(events: MeterEvent[]): Promise<void> {
    if (!this.config.apiUrl) return;

    try {
      const resp = await fetch(`${this.config.apiUrl}/usage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
        },
        body: JSON.stringify({ events }),
      });
      if (!resp.ok) throw new Error(`Billing API error: ${resp.status}`);
    } catch (err) {
      console.error("[Billing] Usage report failed:", err);
    }
  }

  async syncPlan(planId?: string): Promise<BillingPlan | null> {
    if (!this.config.apiUrl) return null;

    try {
      const url = planId
        ? `${this.config.apiUrl}/plans/${planId}`
        : `${this.config.apiUrl}/plans/current`;
      const resp = await fetch(url, {
        headers: this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {},
      });
      if (!resp.ok) return null;
      return (await resp.json()) as BillingPlan;
    } catch {
      return null;
    }
  }
}
