// ── Worker Module — TaskScheduler ──────────────────────────────

import type { WorkerTask, TaskPriority } from "./types";

const _PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
}; void _PRIORITY_ORDER;

export class TaskScheduler {
  private readonly queues: Map<TaskPriority, WorkerTask[]> = new Map([
    ["high", []],
    ["normal", []],
    ["low", []],
  ]);

  enqueue(task: WorkerTask): void {
    const queue = this.queues.get(task.priority) ?? this.queues.get("normal")!;
    queue.push(task);
  }

  dequeue(): WorkerTask | null {
    for (const priority of ["high", "normal", "low"] as TaskPriority[]) {
      const queue = this.queues.get(priority)!;
      if (queue.length > 0) {
        return queue.shift()!;
      }
    }
    return null;
  }

  getPending(): WorkerTask[] {
    const result: WorkerTask[] = [];
    for (const priority of ["high", "normal", "low"] as TaskPriority[]) {
      result.push(...this.queues.get(priority)!);
    }
    return result;
  }

  get size(): number {
    let count = 0;
    for (const q of this.queues.values()) count += q.length;
    return count;
  }

  clear(): void {
    for (const q of this.queues.values()) q.length = 0;
  }
}
