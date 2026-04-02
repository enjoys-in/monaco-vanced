// ── Dev Mode — development-time logging, hot-reload hooks, inspector toggle ──

import type { EventBus } from "./event-bus";
import type { IDisposable } from "./types";

export interface DevModeConfig {
  /** Enable verbose event logging (default: false) */
  logEvents?: boolean;
  /** Enable performance marks (default: false) */
  perfMarks?: boolean;
  /** Custom log prefix */
  prefix?: string;
}

const DEFAULT_CONFIG: Required<DevModeConfig> = {
  logEvents: false,
  perfMarks: false,
  prefix: "[dev]",
};

export class DevMode implements IDisposable {
  private config: Required<DevModeConfig>;
  private disposables: IDisposable[] = [];
  private enabled = false;
  private eventLog: Array<{ event: string; args: unknown[]; ts: number }> = [];

  constructor(
    private readonly eventBus: EventBus,
    config?: DevModeConfig,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Activate dev mode — starts event logging and perf marks */
  enable(): void {
    if (this.enabled) return;
    this.enabled = true;

    if (this.config.logEvents) {
      this.patchEventBus();
    }

    console.info(`${this.config.prefix} Dev mode enabled`);
  }

  /** Deactivate dev mode */
  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
    console.info(`${this.config.prefix} Dev mode disabled`);
  }

  /** Check if dev mode is active */
  isEnabled(): boolean {
    return this.enabled;
  }

  /** Get captured event log (only when logEvents: true) */
  getEventLog(): ReadonlyArray<{ event: string; args: unknown[]; ts: number }> {
    return this.eventLog;
  }

  /** Clear captured event log */
  clearEventLog(): void {
    this.eventLog.length = 0;
  }

  /** Mark a performance point */
  mark(label: string): void {
    if (!this.enabled || !this.config.perfMarks) return;
    performance.mark(`${this.config.prefix} ${label}`);
  }

  /** Measure between two marks */
  measure(label: string, startMark: string, endMark: string): PerformanceMeasure | undefined {
    if (!this.enabled || !this.config.perfMarks) return undefined;
    try {
      return performance.measure(
        `${this.config.prefix} ${label}`,
        `${this.config.prefix} ${startMark}`,
        `${this.config.prefix} ${endMark}`,
      );
    } catch {
      return undefined;
    }
  }

  /** Wrap the event bus emit to log all events */
  private patchEventBus(): void {
    const origEmit = this.eventBus.emit.bind(this.eventBus);
    const prefix = this.config.prefix;
    const log = this.eventLog;

    this.eventBus.emit = (event: string, ...args: unknown[]) => {
      const ts = performance.now();
      log.push({ event, args, ts });
      console.debug(`${prefix} emit: ${event}`, ...args);
      return origEmit(event, ...args);
    };

    this.disposables.push({
      dispose: () => {
        this.eventBus.emit = origEmit;
      },
    });
  }

  dispose(): void {
    this.disable();
    this.eventLog.length = 0;
  }
}
