// ── Central event bus — pub/sub for all plugin communication ──
// Supports exact match, wildcard (file:*), and once() subscriptions.

import type { IDisposable } from "./types";

type EventHandler = (...args: unknown[]) => void;

export class EventBus {
  private listeners = new Map<string, Set<EventHandler>>();
  private wildcardListeners = new Map<string, Set<EventHandler>>();

  /**
   * Subscribe to an event. Supports wildcards: "file:*" matches any "file:..." event.
   */
  on(event: string, handler: EventHandler): IDisposable {
    const isWildcard = event.endsWith(":*");
    const map = isWildcard ? this.wildcardListeners : this.listeners;
    const key = isWildcard ? event.slice(0, -2) : event;

    if (!map.has(key)) {
      map.set(key, new Set());
    }
    map.get(key)!.add(handler);

    return {
      dispose: () => {
        map.get(key)?.delete(handler);
        if (map.get(key)?.size === 0) map.delete(key);
      },
    };
  }

  /**
   * Subscribe once — handler auto-disposes after first invocation.
   */
  once(event: string, handler: EventHandler): IDisposable {
    const wrapper: EventHandler = (...args) => {
      disposable.dispose();
      handler(...args);
    };
    const disposable = this.on(event, wrapper);
    return disposable;
  }

  /**
   * Emit an event. Invokes exact handlers first, then matching wildcard handlers.
   */
  emit(event: string, ...args: unknown[]): void {
    // Exact match
    const exact = this.listeners.get(event);
    if (exact) {
      for (const handler of exact) {
        try {
          handler(...args);
        } catch (err) {
          console.error(`[EventBus] Error in handler for "${event}":`, err);
        }
      }
    }

    // Wildcard match: "file:open" → check for "file" prefix
    const colonIdx = event.indexOf(":");
    if (colonIdx > 0) {
      const domain = event.slice(0, colonIdx);
      const wildcards = this.wildcardListeners.get(domain);
      if (wildcards) {
        for (const handler of wildcards) {
          try {
            handler(...args);
          } catch (err) {
            console.error(`[EventBus] Error in wildcard handler for "${domain}:*" on "${event}":`, err);
          }
        }
      }
    }
  }

  /**
   * Remove a specific handler from an event.
   */
  off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  /**
   * Check if any listeners are registered for an event.
   */
  hasListeners(event: string): boolean {
    const exact = this.listeners.get(event);
    if (exact && exact.size > 0) return true;
    const colonIdx = event.indexOf(":");
    if (colonIdx > 0) {
      const domain = event.slice(0, colonIdx);
      const wildcards = this.wildcardListeners.get(domain);
      if (wildcards && wildcards.size > 0) return true;
    }
    return false;
  }

  /**
   * Remove all listeners.
   */
  clear(): void {
    this.listeners.clear();
    this.wildcardListeners.clear();
  }

  /** Alias for clear() — spec compliance. */
  dispose(): void {
    this.clear();
  }
}
