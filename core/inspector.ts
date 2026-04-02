// ── Inspector — runtime plugin & event introspection ─────────
// Provides a queryable view of registered plugins, their states,
// event subscriptions, and performance data for debugging.

import type { IDisposable } from "./types";
import type { EventBus } from "./event-bus";

export interface PluginSnapshot {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  bootTimeMs?: number;
  dependencies: string[];
  errorCount: number;
}

export interface EventSnapshot {
  event: string;
  listenerCount: number;
  lastEmittedAt?: number;
  totalEmits: number;
}

export interface InspectorData {
  plugins: PluginSnapshot[];
  events: EventSnapshot[];
  uptime: number;
}

export class Inspector implements IDisposable {
  private pluginSnapshots = new Map<string, PluginSnapshot>();
  private eventStats = new Map<string, { count: number; lastAt?: number; listeners: number }>();
  private disposables: IDisposable[] = [];
  private startTime = performance.now();
  private active = false;

  constructor(private readonly eventBus: EventBus) {}

  /** Start tracking events and plugin states */
  enable(): void {
    if (this.active) return;
    this.active = true;
    this.startTime = performance.now();
    this.patchEventBus();
  }

  /** Stop tracking */
  disable(): void {
    if (!this.active) return;
    this.active = false;
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
  }

  /** Check if inspector is active */
  isActive(): boolean {
    return this.active;
  }

  /** Register a plugin snapshot (called by engine during boot) */
  registerPlugin(snapshot: PluginSnapshot): void {
    this.pluginSnapshots.set(snapshot.id, snapshot);
  }

  /** Update a plugin's boot time or error count */
  updatePlugin(id: string, update: Partial<Pick<PluginSnapshot, "bootTimeMs" | "errorCount" | "enabled">>): void {
    const existing = this.pluginSnapshots.get(id);
    if (existing) {
      Object.assign(existing, update);
    }
  }

  /** Get a snapshot of all plugin states */
  getPlugins(): PluginSnapshot[] {
    return [...this.pluginSnapshots.values()];
  }

  /** Get a snapshot of event statistics */
  getEvents(): EventSnapshot[] {
    return [...this.eventStats.entries()].map(([event, stats]) => ({
      event,
      listenerCount: stats.listeners,
      lastEmittedAt: stats.lastAt,
      totalEmits: stats.count,
    }));
  }

  /** Get full inspector data */
  getData(): InspectorData {
    return {
      plugins: this.getPlugins(),
      events: this.getEvents(),
      uptime: performance.now() - this.startTime,
    };
  }

  /** Get stats for a specific event */
  getEventStats(event: string): EventSnapshot | undefined {
    const stats = this.eventStats.get(event);
    if (!stats) return undefined;
    return {
      event,
      listenerCount: stats.listeners,
      lastEmittedAt: stats.lastAt,
      totalEmits: stats.count,
    };
  }

  /** Reset all collected data */
  reset(): void {
    this.pluginSnapshots.clear();
    this.eventStats.clear();
    this.startTime = performance.now();
  }

  /** Intercept event bus to track emit/listener stats */
  private patchEventBus(): void {
    const origEmit = this.eventBus.emit.bind(this.eventBus);
    const stats = this.eventStats;

    this.eventBus.emit = (event: string, ...args: unknown[]) => {
      const entry = stats.get(event) ?? { count: 0, listeners: 0 };
      entry.count++;
      entry.lastAt = performance.now();
      stats.set(event, entry);
      return origEmit(event, ...args);
    };

    const origOn = this.eventBus.on.bind(this.eventBus);
    this.eventBus.on = (event: string, handler: (...args: unknown[]) => void): IDisposable => {
      const entry = stats.get(event) ?? { count: 0, listeners: 0 };
      entry.listeners++;
      stats.set(event, entry);

      const disposable = origOn(event, handler);
      return {
        dispose: () => {
          disposable.dispose();
          const e = stats.get(event);
          if (e) e.listeners = Math.max(0, e.listeners - 1);
        },
      };
    };

    this.disposables.push({
      dispose: () => {
        this.eventBus.emit = origEmit;
        this.eventBus.on = origOn;
      },
    });
  }

  dispose(): void {
    this.disable();
    this.pluginSnapshots.clear();
    this.eventStats.clear();
  }
}
