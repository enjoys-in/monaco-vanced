// ── Security Module — PermissionGate ──────────────────────────

import type { PermissionManifest } from "./types";

export class PermissionGate {
  private readonly registry = new Map<string, Set<string>>();
  private readonly defaultPermissions: Set<string>;

  constructor(defaults: string[] = []) {
    this.defaultPermissions = new Set(defaults);
  }

  register(pluginId: string, manifest: PermissionManifest): void {
    this.registry.set(pluginId, new Set(manifest.permissions));
  }

  check(pluginId: string, capability: string): boolean {
    const perms = this.registry.get(pluginId);
    if (!perms) return this.defaultPermissions.has(capability);
    return perms.has(capability) || this.defaultPermissions.has(capability);
  }

  getPermissions(pluginId: string): string[] {
    const perms = this.registry.get(pluginId);
    return perms ? Array.from(perms) : [];
  }

  revokeAll(pluginId: string): void {
    this.registry.delete(pluginId);
  }
}
