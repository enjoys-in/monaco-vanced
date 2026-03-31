// ── Role Manager ───────────────────────────────────────────

import type { Policy, Role } from "./types";

export class RoleManager {
  private readonly roles = new Map<string, Role>();
  private readonly assignments = new Map<string, Set<string>>(); // actorId → roleIds

  createRole(role: Role): void {
    this.roles.set(role.id, role);
  }

  deleteRole(roleId: string): void {
    this.roles.delete(roleId);
    // Clean up assignments
    for (const roleSet of this.assignments.values()) {
      roleSet.delete(roleId);
    }
  }

  assignRole(actorId: string, roleId: string): void {
    if (!this.roles.has(roleId)) {
      throw new Error(`Role "${roleId}" does not exist`);
    }
    let actorRoles = this.assignments.get(actorId);
    if (!actorRoles) {
      actorRoles = new Set();
      this.assignments.set(actorId, actorRoles);
    }
    actorRoles.add(roleId);
  }

  unassignRole(actorId: string, roleId: string): void {
    this.assignments.get(actorId)?.delete(roleId);
  }

  getRoles(actorId: string): Role[] {
    const roleIds = this.assignments.get(actorId);
    if (!roleIds) return [];
    return [...roleIds]
      .map((id) => this.roles.get(id))
      .filter((r): r is Role => r !== undefined);
  }

  getEffectivePermissions(
    actorId: string,
    policyLookup: (id: string) => Policy | undefined,
  ): Policy[] {
    const roles = this.getRoles(actorId);
    const policyIds = new Set(roles.flatMap((r) => r.policies));
    return [...policyIds]
      .map((id) => policyLookup(id))
      .filter((p): p is Policy => p !== undefined);
  }

  getAllRoles(): Role[] {
    return [...this.roles.values()];
  }
}
