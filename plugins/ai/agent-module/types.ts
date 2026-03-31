// ── Agent Module Types ─────────────────────────────────────

export type AgentTaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface AgentStep {
  readonly id: string;
  readonly action: string;
  readonly input: Record<string, unknown>;
  readonly output?: unknown;
  readonly status: AgentTaskStatus;
  readonly error?: string;
  readonly startedAt?: number;
  readonly completedAt?: number;
}

export interface AgentTask {
  readonly id: string;
  readonly goal: string;
  readonly steps: AgentStep[];
  readonly status: AgentTaskStatus;
  readonly createdAt: number;
  readonly completedAt?: number;
}

export type AgentAction = (input: Record<string, unknown>, context: AgentActionContext) => Promise<unknown>;

export interface AgentActionContext {
  readonly taskId: string;
  readonly emit: (event: string, data: unknown) => void;
}

export interface AgentConfig {
  readonly maxSteps?: number;
  readonly stepTimeout?: number;
}

export interface AgentModuleAPI {
  registerAction(name: string, handler: AgentAction): void;
  run(goal: string, steps: Array<{ action: string; input: Record<string, unknown> }>): Promise<AgentTask>;
  cancel(taskId: string): void;
  getTask(taskId: string): AgentTask | undefined;
  getTasks(): AgentTask[];
}
