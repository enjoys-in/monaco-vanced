// ── Channel Manager ────────────────────────────────────────

import type { Channel, RealtimeMessage } from "./types";

export type ChannelHandler = (data?: unknown) => void;

export class ChannelManager {
  private readonly channels = new Map<string, Channel>();
  private readonly handlers = new Map<string, Set<ChannelHandler>>();

  subscribe(channelId: string, handler: ChannelHandler): void {
    if (!this.channels.has(channelId)) {
      this.channels.set(channelId, {
        id: channelId,
        subscribers: new Set(),
      });
    }

    let channelHandlers = this.handlers.get(channelId);
    if (!channelHandlers) {
      channelHandlers = new Set();
      this.handlers.set(channelId, channelHandlers);
    }
    channelHandlers.add(handler);
  }

  unsubscribe(channelId: string, handler?: ChannelHandler): void {
    if (handler) {
      this.handlers.get(channelId)?.delete(handler);
    } else {
      this.handlers.delete(channelId);
      this.channels.delete(channelId);
    }
  }

  publish(channelId: string, message: RealtimeMessage): void {
    const channelHandlers = this.handlers.get(channelId);
    if (channelHandlers) {
      for (const handler of channelHandlers) {
        handler(message);
      }
    }
  }

  getSubscribers(channelId: string): Set<string> {
    return this.channels.get(channelId)?.subscribers ?? new Set();
  }

  getChannel(channelId: string): Channel | undefined {
    return this.channels.get(channelId);
  }

  getChannelIds(): string[] {
    return [...this.channels.keys()];
  }
}
