// ── Task Runner ────────────────────────────────────────────
// Sequential multi-step execution loop with cancellation.

import type { AgentAction, AgentActionContext, AgentStep, AgentTask, AgentTaskStatus } from "./types";

export class TaskRunner {
  private actions = new Map<string, AgentAction>();
  private tasks = new Map<string, AgentTask>();
  private cancelled = new Set<string>();
  private maxSteps: number;
  private stepTimeout: number;

  constructor(maxSteps = 20, stepTimeout = 30_000) {
    this.maxSteps = maxSteps;
    this.stepTimeout = stepTimeout;
  }

  registerAction(name: string, handler: AgentAction): void {
    this.actions.set(name, handler);
  }

  async run(
    taskId: string,
    goal: string,
    steps: AgentStep[],
    emit: (event: string, data: unknown) => void,
  ): Promise<AgentTask> {
    const limitedSteps = steps.slice(0, this.maxSteps);
    const mutableSteps = limitedSteps.map((s) => ({ ...s }));

    const task: AgentTask = {
      id: taskId,
      goal,
      steps: mutableSteps,
      status: "running",
      createdAt: Date.now(),
    };
    this.tasks.set(taskId, task);

    emit("agent:task-start", { taskId, goal, stepCount: mutableSteps.length });

    for (const step of mutableSteps) {
      if (this.cancelled.has(taskId)) {
        this.setTaskStatus(task, "cancelled");
        break;
      }

      const handler = this.actions.get(step.action);
      if (!handler) {
        (step as { status: AgentTaskStatus }).status = "failed";
        (step as { error: string }).error = `Unknown action: ${step.action}`;
        this.setTaskStatus(task, "failed");
        emit("agent:task-fail", { taskId, error: step.error });
        return task;
      }

      (step as { status: AgentTaskStatus }).status = "running";
      (step as { startedAt: number }).startedAt = Date.now();
      emit("agent:step", { taskId, stepId: step.id, action: step.action, status: "running" });

      try {
        const ctx: AgentActionContext = { taskId, emit };
        const result = await Promise.race([
          handler(step.input, ctx),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Step timed out")), this.stepTimeout),
          ),
        ]);
        (step as { output: unknown }).output = result;
        (step as { status: AgentTaskStatus }).status = "completed";
        (step as { completedAt: number }).completedAt = Date.now();
        emit("agent:step", { taskId, stepId: step.id, action: step.action, status: "completed" });
      } catch (err) {
        (step as { status: AgentTaskStatus }).status = "failed";
        (step as { error: string }).error = err instanceof Error ? err.message : String(err);
        (step as { completedAt: number }).completedAt = Date.now();
        this.setTaskStatus(task, "failed");
        emit("agent:task-fail", { taskId, error: step.error });
        return task;
      }
    }

    if ((task as { status: AgentTaskStatus }).status === "running") {
      this.setTaskStatus(task, "completed");
      emit("agent:task-complete", { taskId });
    }

    return task;
  }

  cancel(taskId: string): void {
    this.cancelled.add(taskId);
  }

  getTask(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId);
  }

  getTasks(): AgentTask[] {
    return Array.from(this.tasks.values());
  }

  private setTaskStatus(task: AgentTask, status: AgentTaskStatus): void {
    (task as { status: AgentTaskStatus }).status = status;
    if (status === "completed" || status === "failed" || status === "cancelled") {
      (task as { completedAt: number }).completedAt = Date.now();
    }
  }
}
