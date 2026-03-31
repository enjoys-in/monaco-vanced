// ── Fallback Module — FallbackRegistry ────────────────────────

import type { FallbackProvider, FallbackChain } from "./types";

export class FallbackRegistry {
  private readonly chains = new Map<string, FallbackChain>();
  private readonly forced = new Map<string, string>();

  register(domain: string, providers: FallbackProvider[]): void {
    const sorted = [...providers].sort((a, b) => a.priority - b.priority);
    this.chains.set(domain, { domain, providers: sorted });
  }

  get(domain: string): FallbackChain | undefined {
    return this.chains.get(domain);
  }

  getAll(): FallbackChain[] {
    return Array.from(this.chains.values());
  }

  getProviders(domain: string): FallbackProvider[] {
    return this.chains.get(domain)?.providers ?? [];
  }

  forceProvider(domain: string, id: string): void {
    this.forced.set(domain, id);
  }

  getForcedProvider(domain: string): string | undefined {
    return this.forced.get(domain);
  }

  clearForced(domain: string): void {
    this.forced.delete(domain);
  }

  remove(domain: string): void {
    this.chains.delete(domain);
    this.forced.delete(domain);
  }
}
