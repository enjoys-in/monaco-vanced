// ── Policy Module Types ────────────────────────────────────

export interface PolicyRule {
  resource: string;
  actions: string[];
  effect: "allow" | "deny";
  conditions?: Record<string, unknown>;
}

export interface Policy {
  id: string;
  name: string;
  rules: PolicyRule[];
  priority?: number;
}

export interface Role {
  id: string;
  name: string;
  policies: string[];
}

export interface PolicyConfig {
  defaultEffect?: "allow" | "deny";
}

export interface PolicyEvalResult {
  allowed: boolean;
  reason?: string;
}

export interface PolicyModuleAPI {
  evaluate(actor: string, action: string, resource: string): PolicyEvalResult;
  addPolicy(policy: Policy): void;
  removePolicy(id: string): void;
  createRole(role: Role): void;
  assignRole(actorId: string, roleId: string): void;
  getRoles(actorId: string): Role[];
}
