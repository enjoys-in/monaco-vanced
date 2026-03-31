// ── Secret Injector ────────────────────────────────────────

import type { SecretProvider } from "./types";

const DEFAULT_PATTERN = /\$\{secret:([^}]+)\}/g;

export class SecretInjector {
  private readonly providers: Map<string, SecretProvider>;
  private readonly defaultProvider: string | undefined;

  constructor(providers: Map<string, SecretProvider>, defaultProvider?: string) {
    this.providers = providers;
    this.defaultProvider = defaultProvider;
  }

  async inject(template: string): Promise<string> {
    const matches = [...template.matchAll(DEFAULT_PATTERN)];
    if (matches.length === 0) return template;

    let result = template;
    for (const match of matches) {
      const fullMatch = match[0];
      const key = match[1];

      const value = await this.resolveSecret(key);
      result = result.replace(fullMatch, value ?? `\${secret:${key}:NOT_FOUND}`);
    }

    return result;
  }

  mask(value: string): string {
    if (value.length <= 4) return "****";
    return value.slice(0, 2) + "*".repeat(value.length - 4) + value.slice(-2);
  }

  private async resolveSecret(key: string): Promise<string | null> {
    // Try key with provider prefix (e.g., "vault:my-secret")
    const colonIdx = key.indexOf(":");
    if (colonIdx > 0) {
      const providerName = key.slice(0, colonIdx);
      const secretKey = key.slice(colonIdx + 1);
      const provider = this.providers.get(providerName);
      if (provider) return provider.get(secretKey);
    }

    // Fall back to default provider
    if (this.defaultProvider) {
      const provider = this.providers.get(this.defaultProvider);
      if (provider) return provider.get(key);
    }

    // Try all providers
    for (const provider of this.providers.values()) {
      const value = await provider.get(key);
      if (value !== null) return value;
    }

    return null;
  }
}
