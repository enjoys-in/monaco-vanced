// ── SaaS Tenant Module ─────────────────────────────────────

import type { MonacoPlugin, PluginContext } from "@core/types";
import type {
  SaasTenantConfig,
  SaasTenantModuleAPI,
  Tenant,
  TenantConfig,
  TenantIsolationConfig,
} from "./types";
import { TenantIsolation } from "./isolation";
import { TenantQuotaManager } from "./quotas";
import { TenantAdmin } from "./admin";

export type { SaasTenantConfig, SaasTenantModuleAPI, Tenant, TenantConfig, TenantIsolationConfig };
export { TenantIsolation, TenantQuotaManager, TenantAdmin };

export function createSaasTenantPlugin(
  _config: SaasTenantConfig = {},
): { plugin: MonacoPlugin; api: SaasTenantModuleAPI } {
  const admin = new TenantAdmin();
  const _quotaManager = new TenantQuotaManager(); void _quotaManager;
  let currentTenant: Tenant | null = null;
  let isolation = new TenantIsolation({ storagePrefix: "default", namespacePrefix: "default" });

  let ctx: PluginContext | null = null;

  const api: SaasTenantModuleAPI = {
    getTenant(): Tenant | null {
      return currentTenant;
    },

    setTenant(tenant: Tenant): void {
      const prev = currentTenant;
      currentTenant = tenant;
      isolation = new TenantIsolation({
        storagePrefix: `tenant:${tenant.id}`,
        namespacePrefix: `ns:${tenant.id}`,
      });
      ctx?.emit("tenant:switch", { from: prev?.id, to: tenant.id });
    },

    getConfig(): TenantConfig | null {
      return currentTenant?.config ?? null;
    },

    updateConfig(partial: Partial<TenantConfig>): void {
      if (!currentTenant) return;
      currentTenant = {
        ...currentTenant,
        config: { ...currentTenant.config, ...partial },
      };
      admin.update(currentTenant.id, { config: currentTenant.config });
      ctx?.emit("tenant:config-change", { tenantId: currentTenant.id, config: currentTenant.config });
    },

    getIsolation(): TenantIsolationConfig {
      return isolation.getConfig();
    },

    listTenants(): Tenant[] {
      return admin.list();
    },
  };

  const plugin: MonacoPlugin = {
    id: "saas-tenant-module",
    name: "SaaS Tenant Module",
    version: "1.0.0",
    description: "Multi-tenant isolation, quota management, and tenant administration",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;
    },

    onDispose(): void {
      ctx = null;
    },
  };

  return { plugin, api };
}
