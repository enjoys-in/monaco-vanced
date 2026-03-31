// ── Realtime Module Types ──────────────────────────────────

export interface Channel {
  id: string;
  subscribers: Set<string>;
  metadata?: Record<string, unknown>;
}

export interface RealtimeMessage {
  channel: string;
  type: string;
  payload: unknown;
  sender?: string;
  timestamp: number;
}

export interface PresenceState {
  userId: string;
  status: "online" | "away" | "offline";
  metadata?: Record<string, unknown>;
  lastSeen: number;
}

export interface RealtimeConfig {
  url?: string;
  reconnect?: boolean;
  heartbeatMs?: number;
}

export interface RealtimeModuleAPI {
  subscribe(channelId: string, handler: (data?: unknown) => void): void;
  unsubscribe(channelId: string): void;
  publish(channelId: string, message: Omit<RealtimeMessage, "channel" | "timestamp">): void;
  getPresence(channelId: string): PresenceState[];
  setPresence(state: Omit<PresenceState, "lastSeen">): void;
}
