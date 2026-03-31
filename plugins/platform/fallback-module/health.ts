// ── Fallback Module — HealthChecker ───────────────────────────

import type { FallbackProvider, ProviderHealth } from "./types";

export class HealthChecker {
  private readonly healthMap = new Map<string, ProviderHealth>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private providers: FallbackProvider[] = [];

  setProviders(providers: FallbackProvider[]): void {
    this.providers = providers;
  }

  async check(provider: FallbackProvider): Promise<ProviderHealth> {
    const start = performance.now();
    let healthy = false;

    try {
      healthy = await provider.check();
    } catch {
      healthy = false;
    }

    const health: ProviderHealth = {
      id: provider.id,
      healthy,
      latency: Math.round(performance.now() - start),
      lastCheck: Date.now(),
    };

    this.healthMap.set(provider.id, health);
    return health;
  }

  async checkAll(providers: FallbackProvider[]): Promise<ProviderHealth[]> {
    return Promise.all(providers.map((p) => this.check(p)));
  }

  getHealth(providerId: string): ProviderHealth | undefined {
    return this.healthMap.get(providerId);
  }

  getAllHealth(): ProviderHealth[] {
    return Array.from(this.healthMap.values());
  }

  startMonitoring(intervalMs: number): void {
    this.stopMonitoring();
    this.timer = setInterval(() => {
      this.checkAll(this.providers).catch(() => {});
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
