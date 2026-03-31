// ── Presence Manager ───────────────────────────────────────

import type { PresenceState } from "./types";

export type PresenceChangeHandler = (state: PresenceState) => void;

export class PresenceManager {
  private readonly states = new Map<string, PresenceState>();
  private readonly channelPresence = new Map<string, Set<string>>(); // channelId → userIds
  private readonly changeHandlers: Set<PresenceChangeHandler> = new Set();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private readonly heartbeatMs: number;
  private readonly offlineThresholdMs: number;

  constructor(heartbeatMs = 30000) {
    this.heartbeatMs = heartbeatMs;
    this.offlineThresholdMs = heartbeatMs * 3;
  }

  setPresence(state: Omit<PresenceState, "lastSeen">, channelId?: string): void {
    const full: PresenceState = {
      ...state,
      lastSeen: Date.now(),
    };
    this.states.set(state.userId, full);

    if (channelId) {
      let users = this.channelPresence.get(channelId);
      if (!users) {
        users = new Set();
        this.channelPresence.set(channelId, users);
      }
      users.add(state.userId);
    }

    for (const handler of this.changeHandlers) {
      handler(full);
    }
  }

  getPresence(userId: string): PresenceState | undefined {
    return this.states.get(userId);
  }

  getChannelPresence(channelId: string): PresenceState[] {
    const userIds = this.channelPresence.get(channelId);
    if (!userIds) return [];
    return [...userIds]
      .map((id) => this.states.get(id))
      .filter((s): s is PresenceState => s !== undefined);
  }

  onPresenceChange(handler: PresenceChangeHandler): () => void {
    this.changeHandlers.add(handler);
    return () => this.changeHandlers.delete(handler);
  }

  startHeartbeatDetection(): void {
    this.stopHeartbeatDetection();
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      for (const [userId, state] of this.states) {
        if (state.status !== "offline" && now - state.lastSeen > this.offlineThresholdMs) {
          const updated: PresenceState = { ...state, status: "offline", lastSeen: state.lastSeen };
          this.states.set(userId, updated);
          for (const handler of this.changeHandlers) {
            handler(updated);
          }
        }
      }
    }, this.heartbeatMs);
  }

  stopHeartbeatDetection(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
