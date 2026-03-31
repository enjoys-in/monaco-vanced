// ── Fallback Module — FailoverManager ─────────────────────────


import { FallbackRegistry } from "./registry";
import { HealthChecker } from "./health";

export class FailoverManager {
  private readonly registry: FallbackRegistry;
  private readonly failoverHandlers: Array<(data: unknown) => void> = [];
  private readonly cooldowns = new Map<string, number>();
  private readonly cooldownMs: number;

  constructor(
    registry: FallbackRegistry,
    _healthChecker: HealthChecker,
    cooldownMs = 5000,
  ) {
    this.registry = registry;
    this.cooldownMs = cooldownMs;
  }

  async execute<T>(domain: string, fn: (providerId: string) => Promise<T>): Promise<T> {
    const forced = this.registry.getForcedProvider(domain);
    if (forced) {
      return fn(forced);
    }

    const providers = this.registry.getProviders(domain);
    if (providers.length === 0) {
      throw new Error(`No providers registered for domain "${domain}"`);
    }

    let lastError: unknown;
    for (const provider of providers) {
      // Skip providers in cooldown
      const cooldownUntil = this.cooldowns.get(provider.id) ?? 0;
      if (Date.now() < cooldownUntil) continue;

      try {
        const result = await fn(provider.id);
        return result;
      } catch (err) {
        lastError = err;
        this.cooldowns.set(provider.id, Date.now() + this.cooldownMs);
        this.notifyFailover(domain, provider.id, String(err));
      }
    }

    throw lastError ?? new Error(`All providers for "${domain}" failed`);
  }

  onFailover(handler: (data: unknown) => void): () => void {
    this.failoverHandlers.push(handler);
    return () => {
      const idx = this.failoverHandlers.indexOf(handler);
      if (idx !== -1) this.failoverHandlers.splice(idx, 1);
    };
  }

  private notifyFailover(domain: string, providerId: string, reason: string): void {
    const data = { domain, providerId, reason, timestamp: Date.now() };
    this.failoverHandlers.forEach((h) => {
      try { h(data); } catch {}
    });
  }
}
