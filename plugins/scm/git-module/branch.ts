// ── Branch Manager ─────────────────────────────────────────

import type { GitBranch } from "./types";

export class BranchManager {
  private branches: GitBranch[] = [];
  private current: string | null = null;

  sync(branches: GitBranch[]): void {
    this.branches = branches;
    const cur = branches.find((b) => b.current);
    this.current = cur?.name ?? null;
  }

  getCurrent(): string | null {
    return this.current;
  }

  getAll(): GitBranch[] {
    return [...this.branches];
  }

  setCurrent(name: string): void {
    this.current = name;
    this.branches = this.branches.map((b) => ({ ...b, current: b.name === name }));
  }
}
