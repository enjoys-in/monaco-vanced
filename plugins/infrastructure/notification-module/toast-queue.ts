// ── Notification Module — Toast Queue ──────────────────────────

import type { Notification, NotificationType } from "./types";

export class ToastQueue {
  private readonly queue: Notification[] = [];
  private readonly visible: Notification[] = [];
  private readonly maxVisible: number;
  private readonly defaultDuration: number;
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private onDismiss: ((id: string) => void) | null = null;

  constructor(maxVisible = 5, defaultDuration = 5000) {
    this.maxVisible = maxVisible;
    this.defaultDuration = defaultDuration;
  }

  setDismissHandler(handler: (id: string) => void): void {
    this.onDismiss = handler;
  }

  enqueue(notification: Notification): void {
    if (this.visible.length < this.maxVisible) {
      this.visible.push(notification);
      this.startAutoHide(notification);
    } else {
      this.queue.push(notification);
    }
  }

  dismiss(id: string): Notification | undefined {
    // Clear timer
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    // Remove from visible
    const visIdx = this.visible.findIndex((n) => n.id === id);
    let removed: Notification | undefined;
    if (visIdx >= 0) {
      removed = this.visible.splice(visIdx, 1)[0];
      // Promote from queue
      if (this.queue.length > 0) {
        const next = this.queue.shift()!;
        this.visible.push(next);
        this.startAutoHide(next);
      }
    } else {
      // Remove from queue
      const qIdx = this.queue.findIndex((n) => n.id === id);
      if (qIdx >= 0) {
        removed = this.queue.splice(qIdx, 1)[0];
      }
    }

    return removed;
  }

  dismissAll(): void {
    for (const [_id, timer] of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.visible.length = 0;
    this.queue.length = 0;
  }

  getVisible(): Notification[] {
    return [...this.visible];
  }

  getAll(): Notification[] {
    return [...this.visible, ...this.queue];
  }

  updateProgress(id: string, progress: number): boolean {
    const n = this.visible.find((n) => n.id === id) ?? this.queue.find((n) => n.id === id);
    if (n) {
      n.progress = Math.min(100, Math.max(0, progress));
      return true;
    }
    return false;
  }

  private startAutoHide(notification: Notification): void {
    if (notification.autoHide === false) return;
    const duration = notification.duration ?? this.getDurationForType(notification.type);
    const timer = setTimeout(() => {
      this.timers.delete(notification.id);
      this.dismiss(notification.id);
      this.onDismiss?.(notification.id);
    }, duration);
    this.timers.set(notification.id, timer);
  }

  private getDurationForType(type: NotificationType): number {
    switch (type) {
      case "error":
        return this.defaultDuration * 2;
      case "warning":
        return this.defaultDuration * 1.5;
      default:
        return this.defaultDuration;
    }
  }

  dispose(): void {
    this.dismissAll();
  }
}
