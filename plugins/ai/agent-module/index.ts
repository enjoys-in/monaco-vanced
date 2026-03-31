// ── Agent Module ───────────────────────────────────────────
// Multi-step AI agent with action registry and task runner.

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { AgentConfig, AgentModuleAPI } from "./types";
import { TaskRunner } from "./task-runner";
import { planSteps } from "./planner";

export function createAgentPlugin(
  config: AgentConfig = {},
): { plugin: MonacoPlugin; api: AgentModuleAPI } {
  const runner = new TaskRunner(config.maxSteps, config.stepTimeout);
  let ctx: PluginContext | null = null;

  const emit = (event: string, data: unknown): void => {
    ctx?.emit(event, data);
  };

  const api: AgentModuleAPI = {
    registerAction: (name, handler) => runner.registerAction(name, handler),

    async run(goal, rawSteps) {
      const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const steps = planSteps(rawSteps);
      return runner.run(taskId, goal, steps, emit);
    },

    cancel: (taskId) => runner.cancel(taskId),
    getTask: (taskId) => runner.getTask(taskId),
    getTasks: () => runner.getTasks(),
  };

  const plugin: MonacoPlugin = {
    id: "agent-module",
    name: "Agent Module",
    version: "1.0.0",
    description: "Multi-step AI agent with task runner",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;
    },

    onDispose(): void {
      ctx = null;
    },
  };

  return { plugin, api };
}

export type { AgentTask, AgentStep, AgentAction, AgentActionContext, AgentConfig, AgentModuleAPI } from "./types";
export { TaskRunner } from "./task-runner";
export { planSteps } from "./planner";
