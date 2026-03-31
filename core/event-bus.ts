// ── Central event bus — pub/sub for all plugin communication ──

import type { IDisposable } from "./types";

type EventHandler = (...args: unknown[]) => void;

export class EventBus {
  private listeners = new Map<string, Set<EventHandler>>();

  on(event: string, handler: EventHandler): IDisposable {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return {
      dispose: () => {
        this.listeners.get(event)?.delete(handler);
      },
    };
  }

  once(event: string, handler: EventHandler): IDisposable {
    const wrapper: EventHandler = (...args) => {
      disposable.dispose();
      handler(...args);
    };
    const disposable = this.on(event, wrapper);
    return disposable;
  }

  emit(event: string, ...args: unknown[]): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(...args);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }
    }
  }

  off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  clear(): void {
    this.listeners.clear();
  }
}
