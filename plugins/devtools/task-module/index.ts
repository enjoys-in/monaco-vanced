// ── Task Module — Plugin Entry ────────────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { BackgroundTask, TaskConfig, TaskModuleAPI } from "./types";
import { TaskRunnerPool } from "./runner";
import { ProgressTracker } from "./progress";

export type { BackgroundTask, TaskConfig, TaskModuleAPI, TaskStatus, TaskPriority } from "./types";
export { TaskRunnerPool } from "./runner";
export { PriorityQueue } from "./queue";
export { ProgressTracker } from "./progress";

// ── Factory ──────────────────────────────────────────────────

export function createTaskPlugin(config: TaskConfig = {}): {
  plugin: MonacoPlugin;
  api: TaskModuleAPI;
} {
  const progressTracker = new ProgressTracker();
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;
  let counter = 0;

  const pool = new TaskRunnerPool(config.maxParallel ?? 4, {
    onComplete(task: BackgroundTask) {
      progressTracker.update(task.id, task.progress);

      if (task.status === "completed") {
        ctx?.emit("task:complete", { task });
      } else if (task.status === "failed") {
        ctx?.emit("task:fail", { task });
      } else if (task.status === "cancelled") {
        ctx?.emit("task:cancel", { task });
      }
    },
  });

  // ── API ──────────────────────────────────────────────────

  const api: TaskModuleAPI = {
    enqueue(
      taskDef: Omit<BackgroundTask, "status" | "progress" | "startedAt" | "completedAt">,
    ): BackgroundTask {
      const task: BackgroundTask = {
        ...taskDef,
        id: taskDef.id || `task-${++counter}`,
        status: "pending",
        progress: 0,
      };

      pool.enqueue(task);
      progressTracker.update(task.id, 0);

      ctx?.emit("task:enqueue", { task });
      return task;
    },

    cancel(id: string): void {
      pool.cancel(id);
      ctx?.emit("task:cancel", { id });
    },

    getAll(): BackgroundTask[] {
      return pool.getAll();
    },

    getRunning(): BackgroundTask[] {
      return pool.getRunning();
    },

    getProgress(id: string): number {
      return progressTracker.get(id);
    },

    onProgress(id: string, handler: (percent: number) => void): () => void {
      return progressTracker.onProgress(id, handler);
    },
  };

  // ── Plugin ─────────────────────────────────────────────────

  const plugin: MonacoPlugin = {
    id: "task-module",
    name: "Background Tasks",
    version: "1.0.0",
    description: "Priority-based background task execution with concurrency control",

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      disposables.push(
        ctx.on("task:enqueue", (data?: unknown) => {
          const d = data as Omit<BackgroundTask, "status" | "progress"> | undefined;
          if (d?.id && d.label) api.enqueue(d);
        }),
      );

      disposables.push(
        ctx.on("task:cancel", (data?: unknown) => {
          const d = data as { id: string } | undefined;
          if (d?.id) api.cancel(d.id);
        }),
      );

      disposables.push(
        ctx.on("task:progress", (data?: unknown) => {
          const d = data as { id: string; percent: number } | undefined;
          if (d?.id && d.percent !== undefined) {
            progressTracker.update(d.id, d.percent);
          }
        }),
      );
    },

    onDispose() {
      pool.clear();
      progressTracker.clear();
      for (const d of disposables) d.dispose();
      disposables.length = 0;
      ctx = null;
    },
  };

  return { plugin, api };
}
