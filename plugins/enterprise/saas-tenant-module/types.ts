// ── SaaS Tenant Module Types ───────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  plan?: string;
  config?: TenantConfig;
  createdAt: number;
}

export interface TenantConfig {
  theme?: string;
  features?: string[];
  limits?: Record<string, number>;
}

export interface TenantIsolationConfig {
  storagePrefix: string;
  namespacePrefix: string;
}

export interface SaasTenantConfig {
  defaultPlan?: string;
}

export interface SaasTenantModuleAPI {
  getTenant(): Tenant | null;
  setTenant(tenant: Tenant): void;
  getConfig(): TenantConfig | null;
  updateConfig(partial: Partial<TenantConfig>): void;
  getIsolation(): TenantIsolationConfig;
  listTenants(): Tenant[];
}
