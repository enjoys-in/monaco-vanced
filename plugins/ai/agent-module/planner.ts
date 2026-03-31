// ── Planner ────────────────────────────────────────────────
// Decomposes a goal + raw steps into validated AgentSteps.

import type { AgentStep } from "./types";

export function planSteps(
  steps: Array<{ action: string; input: Record<string, unknown> }>,
): AgentStep[] {
  return steps.map((s, i) => ({
    id: `step-${i}-${Math.random().toString(36).slice(2, 8)}`,
    action: s.action,
    input: s.input,
    status: "pending" as const,
  }));
}
