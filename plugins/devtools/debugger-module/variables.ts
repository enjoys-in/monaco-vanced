// ── Debugger Module — Variable Store ─────────────────────────

import type { Variable } from "./types";

export class VariableStore {
  /** frameId → variables */
  private scopes = new Map<number, Variable[]>();
  /** variablesReference → children */
  private expanded = new Map<number, Variable[]>();

  setScopes(frameId: number, variables: Variable[]): void {
    this.scopes.set(frameId, variables);
  }

  getVariables(frameId: number): Variable[] {
    return this.scopes.get(frameId) ?? [];
  }

  expandVariable(ref: number, children: Variable[]): void {
    this.expanded.set(ref, children);
  }

  getExpanded(ref: number): Variable[] {
    return this.expanded.get(ref) ?? [];
  }

  clear(): void {
    this.scopes.clear();
    this.expanded.clear();
  }
}
