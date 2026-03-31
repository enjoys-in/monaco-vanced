// ── Plugin engine — registers, initializes, and manages plugin lifecycle ──

import type { MonacoPlugin } from "./types";
import { EventBus } from "./event-bus";
import { PluginContext } from "./plugin-context";

export class PluginEngine {
  private plugins = new Map<string, MonacoPlugin>();
  private contexts = new Map<string, PluginContext>();
  private eventBus: EventBus;

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus ?? new EventBus();
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  register(plugin: MonacoPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin "${plugin.id}" is already registered.`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  async initAll(): Promise<void> {
    for (const [id, plugin] of this.plugins) {
      if (this.contexts.has(id)) continue; // already initialized
      const ctx = new PluginContext(id, this.eventBus);
      this.contexts.set(id, ctx);
      try {
        await plugin.init(ctx);
      } catch (err) {
        console.error(`[PluginEngine] Failed to init plugin "${id}":`, err);
        ctx.dispose();
        this.contexts.delete(id);
      }
    }
  }

  async destroyAll(): Promise<void> {
    for (const [id, plugin] of this.plugins) {
      try {
        await plugin.destroy?.();
      } catch (err) {
        console.error(`[PluginEngine] Failed to destroy plugin "${id}":`, err);
      }
      this.contexts.get(id)?.dispose();
    }
    this.plugins.clear();
    this.contexts.clear();
    this.eventBus.clear();
  }

  getPlugin(id: string): MonacoPlugin | undefined {
    return this.plugins.get(id);
  }

  getRegisteredIds(): string[] {
    return [...this.plugins.keys()];
  }
}
