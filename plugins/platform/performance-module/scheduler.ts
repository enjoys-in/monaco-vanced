// ── Performance Module — PriorityScheduler ────────────────────

import type { SchedulerPriority } from "./types";

interface ScheduledTask {
  fn: () => void | Promise<void>;
  priority: SchedulerPriority;
}

export class PriorityScheduler {
  private readonly queue: ScheduledTask[] = [];
  private running = false;

  schedule(fn: () => void | Promise<void>, priority: SchedulerPriority): void {
    if (priority === "high") {
      queueMicrotask(() => fn());
      return;
    }

    if (priority === "idle") {
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(() => fn());
      } else {
        setTimeout(() => fn(), 50);
      }
      return;
    }

    // normal + low go through the queue
    this.queue.push({ fn, priority });
    this.sortQueue();
    this.flush();
  }

  private sortQueue(): void {
    const order: Record<SchedulerPriority, number> = { high: 0, normal: 1, low: 2, idle: 3 };
    this.queue.sort((a, b) => order[a.priority] - order[b.priority]);
  }

  private async flush(): Promise<void> {
    if (this.running) return;
    this.running = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      try {
        await task.fn();
      } catch (e) {
        console.warn("[perf-scheduler] task error:", e);
      }
      // Yield to main thread between tasks
      await new Promise<void>((r) => setTimeout(r, 0));
    }

    this.running = false;
  }
}
