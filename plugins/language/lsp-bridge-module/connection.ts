// ── LSP Bridge Module — Shared Connection Manager ─────────────
// See context/lsp-bridge-module.txt Section 4

import type { EventBus } from "@core/event-bus";
import type { LspConnectionConfig, LspConnectionState } from "./types";
import { LspEvents } from "@core/events";

/**
 * Base connection logic shared by both V1 and V2 clients.
 * Manages state machine, retry logic, and first-connect tracking.
 */
export class LspConnectionManager {
  private state: LspConnectionState = "disconnected";
  private retryCount = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private hasConnectedOnce = false;
  private pingTimer: ReturnType<typeof setTimeout> | null = null;
  private missedPings = 0;

  constructor(
    private eventBus: EventBus,
    private config: LspConnectionConfig,
  ) {}

  // ── State machine ─────────────────────────────────────────

  transition(newState: LspConnectionState): void {
    this.state = newState;

    const eventMap: Record<LspConnectionState, LspEvents> = {
      disconnected: LspEvents.Disconnected,
      connecting: LspEvents.Connecting,
      connected: LspEvents.Connected,
      reconnecting: LspEvents.Reconnecting,
      failed: LspEvents.Failed,
    };

    this.eventBus.emit(eventMap[newState], { state: newState });
  }

  getState(): LspConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === "connected";
  }

  // ── Retry logic ───────────────────────────────────────────

  scheduleRetry(connectFn: () => Promise<void>): void {
    this.cancelRetry();
    this.retryCount++;

    if (this.retryCount >= this.config.maxRetries) {
      this.transition("failed");
      return;
    }

    this.transition("reconnecting");
    this.retryTimer = setTimeout(() => {
      connectFn().catch(() => {
        // Retry will be rescheduled from the error handler
      });
    }, this.config.retryIntervalMs);
  }

  resetRetries(): void {
    this.retryCount = 0;
  }

  cancelRetry(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  getRetryCount(): number {
    return this.retryCount;
  }

  // ── First-connect tracking ────────────────────────────────

  markFirstConnect(): boolean {
    if (!this.hasConnectedOnce) {
      this.hasConnectedOnce = true;
      return true;
    }
    return false;
  }

  // ── Liveness ping ─────────────────────────────────────────

  startPing(onFailure: () => void): void {
    this.stopPing();
    if (!this.config.pingEnabled) return;

    const interval = Math.max(15_000, Math.min(120_000, this.config.pingIntervalMs));

    this.pingTimer = setInterval(() => {
      if (this.state !== "connected") return;

      const pingUrl = this.config.url.replace(/\/+$/, "") + "/ping";

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);

      fetch(pingUrl, { signal: controller.signal })
        .then((res) => {
          clearTimeout(timeout);
          if (res.ok) {
            this.missedPings = 0;
            this.eventBus.emit(LspEvents.PingSuccess, { latencyMs: 0 });
          } else {
            this.handleMissedPing(onFailure);
          }
        })
        .catch(() => {
          clearTimeout(timeout);
          this.handleMissedPing(onFailure);
        });
    }, interval);
  }

  stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    this.missedPings = 0;
  }

  private handleMissedPing(onFailure: () => void): void {
    this.missedPings++;

    if (this.missedPings >= 2) {
      this.eventBus.emit(LspEvents.PingFailed, {
        missedCount: this.missedPings,
      });
      onFailure();
    } else {
      this.eventBus.emit(LspEvents.PingTimeout, {
        missedCount: this.missedPings,
      });
    }
  }

  // ── Cleanup ───────────────────────────────────────────────

  dispose(): void {
    this.cancelRetry();
    this.stopPing();
  }
}
