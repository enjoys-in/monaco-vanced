// ── Policy Module ──────────────────────────────────────────

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { Policy, PolicyConfig, PolicyEvalResult, PolicyModuleAPI, PolicyRule, Role } from "./types";
import { PolicyEngine } from "./engine";
import { RemotePolicySync } from "./remote";
import { RoleManager } from "./roles";

export type { Policy, PolicyConfig, PolicyEvalResult, PolicyModuleAPI, PolicyRule, Role };
export { PolicyEngine, RemotePolicySync, RoleManager };

export function createPolicyPlugin(
  config: PolicyConfig = {},
): { plugin: MonacoPlugin; api: PolicyModuleAPI } {
  const engine = new PolicyEngine(config.defaultEffect);
  const roleManager = new RoleManager();
  const remoteSync = new RemotePolicySync();

  let ctx: PluginContext | null = null;

  const api: PolicyModuleAPI = {
    evaluate(actor: string, action: string, resource: string): PolicyEvalResult {
      const result = engine.evaluate(actor, action, resource);
      if (!result.allowed) {
        ctx?.emit("policy:denied", { actor, action, resource, reason: result.reason });
      }
      return result;
    },

    addPolicy(policy: Policy): void {
      engine.addPolicy(policy);
      ctx?.emit("policy:updated", { action: "add", policyId: policy.id });
    },

    removePolicy(id: string): void {
      engine.removePolicy(id);
      ctx?.emit("policy:updated", { action: "remove", policyId: id });
    },

    assignRole(actorId: string, roleId: string): void {
      roleManager.assignRole(actorId, roleId);
    },

    getRoles(actorId: string): Role[] {
      return roleManager.getRoles(actorId);
    },
  };

  const plugin: MonacoPlugin = {
    id: "policy-module",
    name: "Policy Module",
    version: "1.0.0",
    description: "Role-based access control with priority-based policy evaluation",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;
    },

    onDispose(): void {
      remoteSync.stopPeriodicRefresh();
      ctx = null;
    },
  };

  return { plugin, api };
}
