// ── Error boundary — catches uncaught errors during plugin lifecycle ──

import type { EventBus } from "./event-bus";
import { PluginEvents } from "./events";

export class ErrorBoundary {
  constructor(private eventBus: EventBus) {}

  /**
   * Wraps an async operation with error capture. On failure, emits plugin:error
   * and returns the error instead of throwing.
   */
  async guard<T>(
    pluginId: string,
    operation: string,
    fn: () => T | Promise<T>,
  ): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
    try {
      const value = await fn();
      return { ok: true, value };
    } catch (error) {
      console.error(`[ErrorBoundary] ${pluginId}/${operation} failed:`, error);
      this.eventBus.emit(PluginEvents.Error, { name: pluginId, error, operation });
      return { ok: false, error };
    }
  }

  /**
   * Wraps a sync callback with try/catch. Swallows and logs errors.
   */
  guardSync(pluginId: string, operation: string, fn: () => void): void {
    try {
      fn();
    } catch (error) {
      console.error(`[ErrorBoundary] ${pluginId}/${operation} failed:`, error);
      this.eventBus.emit(PluginEvents.Error, { name: pluginId, error, operation });
    }
  }
}