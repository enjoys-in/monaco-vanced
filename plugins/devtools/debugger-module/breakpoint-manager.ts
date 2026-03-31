// ── Debugger Module — Breakpoint Manager ─────────────────────

import type { Breakpoint } from "./types";

export class BreakpointManager {
  private breakpoints = new Map<string, Breakpoint>();
  private counter = 0;

  add(file: string, line: number, condition?: string): Breakpoint {
    const id = `bp-${++this.counter}`;
    const bp: Breakpoint = {
      id,
      file,
      line,
      condition,
      hitCount: 0,
      enabled: true,
    };
    this.breakpoints.set(id, bp);
    return bp;
  }

  remove(id: string): boolean {
    return this.breakpoints.delete(id);
  }

  toggle(id: string): Breakpoint | undefined {
    const bp = this.breakpoints.get(id);
    if (bp) {
      bp.enabled = !bp.enabled;
    }
    return bp;
  }

  getAll(): Breakpoint[] {
    return [...this.breakpoints.values()];
  }

  getByFile(file: string): Breakpoint[] {
    return this.getAll().filter((bp) => bp.file === file);
  }

  get(id: string): Breakpoint | undefined {
    return this.breakpoints.get(id);
  }

  /**
   * Evaluate whether a breakpoint should pause execution.
   * Increments hit count and checks condition if present.
   */
  shouldBreak(id: string, evalCondition?: (expr: string) => boolean): boolean {
    const bp = this.breakpoints.get(id);
    if (!bp || !bp.enabled) return false;

    bp.hitCount = (bp.hitCount ?? 0) + 1;

    if (bp.condition && evalCondition) {
      return evalCondition(bp.condition);
    }

    return true;
  }

  clear(): void {
    this.breakpoints.clear();
  }
}
