// ── Fallback Module — Types ───────────────────────────────────

import type { IDisposable } from "@core/types";

export interface FallbackProvider {
  id: string;
  check: () => Promise<boolean>;
  priority: number;
}

export interface FallbackChain {
  domain: string;
  providers: FallbackProvider[];
}

export interface ProviderHealth {
  id: string;
  healthy: boolean;
  latency?: number;
  lastCheck: number;
}

export interface FallbackConfig {
  healthCheckInterval?: number;
}

export interface FallbackModuleAPI {
  register(domain: string, providers: FallbackProvider[]): void;
  get(domain: string): FallbackProvider | null;
  getHealth(domain: string): ProviderHealth[];
  forceProvider(domain: string, id: string): void;
  onFailover(handler: (data?: unknown) => void): IDisposable;
}
