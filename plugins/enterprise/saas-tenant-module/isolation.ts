// ── Tenant Isolation ───────────────────────────────────────

import type { TenantIsolationConfig } from "./types";

export class TenantIsolation {
  private config: TenantIsolationConfig;

  constructor(config: TenantIsolationConfig) {
    this.config = { ...config };
  }

  setConfig(config: TenantIsolationConfig): void {
    this.config = { ...config };
  }

  getConfig(): TenantIsolationConfig {
    return { ...this.config };
  }

  scopeKey(key: string): string {
    return `${this.config.storagePrefix}:${key}`;
  }

  scopeNamespace(name: string): string {
    return `${this.config.namespacePrefix}:${name}`;
  }

  scopeStorage(): ScopedStorage {
    const prefix = this.config.storagePrefix;
    return {
      getItem(key: string): string | null {
        try {
          return localStorage.getItem(`${prefix}:${key}`);
        } catch {
          return null;
        }
      },
      setItem(key: string, value: string): void {
        try {
          localStorage.setItem(`${prefix}:${key}`, value);
        } catch {
          // Storage unavailable
        }
      },
      removeItem(key: string): void {
        try {
          localStorage.removeItem(`${prefix}:${key}`);
        } catch {
          // Storage unavailable
        }
      },
    };
  }
}

export interface ScopedStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
