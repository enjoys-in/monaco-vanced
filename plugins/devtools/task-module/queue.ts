// ── Task Module — Priority Queue ─────────────────────────────
// Priority-sorted queue: high > normal > low.

import type { BackgroundTask, TaskPriority } from "./types";

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

export class PriorityQueue {
  private items: BackgroundTask[] = [];

  enqueue(task: BackgroundTask): void {
    // Insert in sorted position
    const order = PRIORITY_ORDER[task.priority];
    let insertIdx = this.items.length;

    for (let i = 0; i < this.items.length; i++) {
      if (PRIORITY_ORDER[this.items[i].priority] > order) {
        insertIdx = i;
        break;
      }
    }

    this.items.splice(insertIdx, 0, task);
  }

  dequeue(): BackgroundTask | undefined {
    return this.items.shift();
  }

  peek(): BackgroundTask | undefined {
    return this.items[0];
  }

  getAll(): BackgroundTask[] {
    return [...this.items];
  }

  remove(id: string): boolean {
    const idx = this.items.findIndex((t) => t.id === id);
    if (idx >= 0) {
      this.items.splice(idx, 1);
      return true;
    }
    return false;
  }

  get size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }
}
