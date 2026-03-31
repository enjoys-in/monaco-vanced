// ── Task Module — Runner Pool ────────────────────────────────
// Executes tasks respecting concurrency limits with per-task AbortController.

import type { BackgroundTask } from "./types";
import { PriorityQueue } from "./queue";

export class TaskRunnerPool {
  private queue: PriorityQueue;
  private maxParallel: number;
  private running = new Map<string, AbortController>();
  private allTasks = new Map<string, BackgroundTask>();
  private onComplete?: (task: BackgroundTask) => void;

  constructor(
    maxParallel = 4,
    callbacks?: {
      onComplete?: (task: BackgroundTask) => void;
    },
  ) {
    this.maxParallel = maxParallel;
    this.queue = new PriorityQueue();
    this.onComplete = callbacks?.onComplete;
  }

  enqueue(task: BackgroundTask): void {
    this.allTasks.set(task.id, task);
    this.queue.enqueue(task);
    this.processQueue();
  }

  cancel(id: string): void {
    const controller = this.running.get(id);
    if (controller) {
      controller.abort();
      this.running.delete(id);
    }

    // Also remove from queue if pending
    this.queue.remove(id);

    const task = this.allTasks.get(id);
    if (task && task.status !== "completed" && task.status !== "failed") {
      task.status = "cancelled";
      task.completedAt = Date.now();
    }
  }

  getRunning(): BackgroundTask[] {
    return [...this.running.keys()]
      .map((id) => this.allTasks.get(id))
      .filter((t): t is BackgroundTask => t !== undefined);
  }

  getAll(): BackgroundTask[] {
    return [...this.allTasks.values()];
  }

  getTask(id: string): BackgroundTask | undefined {
    return this.allTasks.get(id);
  }

  clear(): void {
    for (const [, controller] of this.running) {
      controller.abort();
    }
    this.running.clear();
    this.queue.clear();
    this.allTasks.clear();
  }

  private processQueue(): void {
    while (this.running.size < this.maxParallel && this.queue.size > 0) {
      const task = this.queue.dequeue();
      if (!task) break;
      this.runTask(task);
    }
  }

  private runTask(task: BackgroundTask): void {
    const controller = new AbortController();
    this.running.set(task.id, controller);

    task.status = "running";
    task.startedAt = Date.now();

    const execute = task.execute ?? (() => Promise.resolve());

    execute(controller.signal)
      .then(() => {
        if (task.status === "running") {
          task.status = "completed";
          task.progress = 100;
          task.completedAt = Date.now();
        }
      })
      .catch(() => {
        if (controller.signal.aborted) {
          task.status = "cancelled";
        } else {
          task.status = "failed";
        }
        task.completedAt = Date.now();
      })
      .finally(() => {
        this.running.delete(task.id);
        this.onComplete?.(task);
        this.processQueue();
      });
  }
}
