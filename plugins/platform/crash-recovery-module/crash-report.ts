// ── Crash Recovery Module — CrashReportBuilder ────────────────

import type { CrashReport } from "./types";

export class CrashReportBuilder {
  private readonly eventBuffer: string[] = [];
  private readonly maxEvents: number;
  private activePlugins: string[] = [];

  constructor(maxEvents = 50) {
    this.maxEvents = maxEvents;
  }

  pushEvent(event: string): void {
    this.eventBuffer.push(event);
    if (this.eventBuffer.length > this.maxEvents) {
      this.eventBuffer.shift();
    }
  }

  setActivePlugins(plugins: string[]): void {
    this.activePlugins = [...plugins];
  }

  capture(reason: string, error?: unknown): CrashReport {
    let stackTrace: string | undefined;
    if (error instanceof Error) {
      stackTrace = error.stack;
    } else if (typeof error === "string") {
      stackTrace = error;
    }

    return {
      timestamp: Date.now(),
      reason,
      lastEvents: [...this.eventBuffer],
      activePlugins: [...this.activePlugins],
      stackTrace,
    };
  }

  getLastEvents(): string[] {
    return [...this.eventBuffer];
  }

  clear(): void {
    this.eventBuffer.length = 0;
  }
}
