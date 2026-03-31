// ── Tenant Admin ───────────────────────────────────────────

import type { Tenant, TenantConfig } from "./types";

const STORAGE_KEY = "monaco-vanced:tenants";

export class TenantAdmin {
  private tenants = new Map<string, Tenant>();

  constructor() {
    this.loadFromStorage();
  }

  create(id: string, name: string, plan?: string, config?: TenantConfig): Tenant {
    if (this.tenants.has(id)) {
      throw new Error(`Tenant "${id}" already exists`);
    }
    const tenant: Tenant = {
      id,
      name,
      plan,
      config,
      createdAt: Date.now(),
    };
    this.tenants.set(id, tenant);
    this.saveToStorage();
    return tenant;
  }

  delete(id: string): void {
    this.tenants.delete(id);
    this.saveToStorage();
  }

  update(id: string, partial: Partial<Omit<Tenant, "id" | "createdAt">>): Tenant {
    const tenant = this.tenants.get(id);
    if (!tenant) throw new Error(`Tenant "${id}" not found`);

    const updated: Tenant = { ...tenant, ...partial, id: tenant.id, createdAt: tenant.createdAt };
    this.tenants.set(id, updated);
    this.saveToStorage();
    return updated;
  }

  get(id: string): Tenant | undefined {
    return this.tenants.get(id);
  }

  list(): Tenant[] {
    return [...this.tenants.values()];
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as Tenant[];
        for (const t of arr) {
          this.tenants.set(t.id, t);
        }
      }
    } catch {
      // Storage unavailable
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.tenants.values()]));
    } catch {
      // Storage unavailable
    }
  }
}
