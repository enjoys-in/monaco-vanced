// ── Policy Engine ──────────────────────────────────────────

import type { Policy, PolicyEvalResult, PolicyRule } from "./types";

export class PolicyEngine {
  private readonly policies = new Map<string, Policy>();
  private defaultEffect: "allow" | "deny";

  constructor(defaultEffect: "allow" | "deny" = "deny") {
    this.defaultEffect = defaultEffect;
  }

  addPolicy(policy: Policy): void {
    this.policies.set(policy.id, policy);
  }

  removePolicy(id: string): void {
    this.policies.delete(id);
  }

  getPolicy(id: string): Policy | undefined {
    return this.policies.get(id);
  }

  getAllPolicies(): Policy[] {
    return [...this.policies.values()];
  }

  evaluate(_actor: string, action: string, resource: string): PolicyEvalResult {
    const matchingRules: Array<{ rule: PolicyRule; priority: number }> = [];

    for (const policy of this.policies.values()) {
      for (const rule of policy.rules) {
        if (this.matchesResource(rule.resource, resource) && rule.actions.includes(action)) {
          matchingRules.push({ rule, priority: policy.priority ?? 0 });
        }
      }
    }

    if (matchingRules.length === 0) {
      return {
        allowed: this.defaultEffect === "allow",
        reason: `No matching policy (default: ${this.defaultEffect})`,
      };
    }

    // Sort by priority descending
    matchingRules.sort((a, b) => b.priority - a.priority);

    // Deny overrides allow at same priority
    const topPriority = matchingRules[0].priority;
    const topRules = matchingRules.filter((r) => r.priority === topPriority);

    const hasDeny = topRules.some((r) => r.rule.effect === "deny");
    if (hasDeny) {
      return { allowed: false, reason: "Explicit deny rule matched" };
    }

    const hasAllow = topRules.some((r) => r.rule.effect === "allow");
    if (hasAllow) {
      return { allowed: true, reason: "Explicit allow rule matched" };
    }

    return {
      allowed: this.defaultEffect === "allow",
      reason: `Fallback to default: ${this.defaultEffect}`,
    };
  }

  private matchesResource(pattern: string, resource: string): boolean {
    if (pattern === "*") return true;
    if (pattern.endsWith("/*")) {
      return resource.startsWith(pattern.slice(0, -1));
    }
    return pattern === resource;
  }
}
