// ── Realtime Module ────────────────────────────────────────

import type { MonacoPlugin, PluginContext } from "@core/types";
import type {
  Channel,
  PresenceState,
  RealtimeConfig,
  RealtimeMessage,
  RealtimeModuleAPI,
} from "./types";
import { RealtimeTransport } from "./transport";
import { ChannelManager } from "./channels";
import { PresenceManager } from "./presence";
import { RealtimeEvents } from "@core/events";

export type { Channel, PresenceState, RealtimeConfig, RealtimeMessage, RealtimeModuleAPI };
export { RealtimeTransport, ChannelManager, PresenceManager };

export function createRealtimePlugin(
  config: RealtimeConfig = {},
): { plugin: MonacoPlugin; api: RealtimeModuleAPI } {
  const channels = new ChannelManager();
  const presence = new PresenceManager(config.heartbeatMs);
  const transport = config.url
    ? new RealtimeTransport({
        url: config.url,
        reconnect: config.reconnect,
        heartbeatMs: config.heartbeatMs,
      })
    : null;

  let ctx: PluginContext | null = null;

  const api: RealtimeModuleAPI = {
    subscribe(channelId: string, handler: (data?: unknown) => void): void {
      channels.subscribe(channelId, handler);
    },

    unsubscribe(channelId: string): void {
      channels.unsubscribe(channelId);
    },

    publish(channelId: string, message: Omit<RealtimeMessage, "channel" | "timestamp">): void {
      const full: RealtimeMessage = {
        ...message,
        channel: channelId,
        timestamp: Date.now(),
      };
      channels.publish(channelId, full);
      transport?.send(full);
      ctx?.emit(RealtimeEvents.Message, { channel: channelId, type: message.type });
    },

    getPresence(channelId: string): PresenceState[] {
      return presence.getChannelPresence(channelId);
    },

    setPresence(state: Omit<PresenceState, "lastSeen">): void {
      presence.setPresence(state);
      ctx?.emit(RealtimeEvents.PresenceChange, { userId: state.userId, status: state.status });
    },
  };

  const plugin: MonacoPlugin = {
    id: "realtime-module",
    name: "Realtime Module",
    version: "1.0.0",
    description: "Real-time communication with channels, presence, and WebSocket transport",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;
      transport?.connect();

      transport?.onMessage((data?: unknown) => {
        const msg = data as RealtimeMessage | undefined;
        if (msg?.channel) {
          channels.publish(msg.channel, msg);
        }
      });

      presence.onPresenceChange((state) => {
        ctx?.emit(RealtimeEvents.PresenceChange, { userId: state.userId, status: state.status });
      });

      presence.startHeartbeatDetection();
    },

    onDispose(): void {
      transport?.disconnect();
      presence.stopHeartbeatDetection();
      ctx = null;
    },
  };

  return { plugin, api };
}
