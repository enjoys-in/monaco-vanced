// ── Collab Module ──────────────────────────────────────────
// Real-time collaborative editing with OT/CRDT sync.

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { CollabConfig, CollabModuleAPI, CollabUser, CursorPosition } from "./types";
import { CollabTransport } from "./transport";
import { PresenceTracker } from "./presence";
import { SyncEngine } from "./sync-engine";
import { CollabEvents } from "@core/events/collab.events";

export function createCollabPlugin(
  config: CollabConfig = {},
): { plugin: MonacoPlugin; api: CollabModuleAPI } {
  const transport = new CollabTransport();
  const presence = new PresenceTracker();
  let syncEngine: SyncEngine | null = null;
  let ctx: PluginContext | null = null;

  const api: CollabModuleAPI = {
    async join(roomId, user) {
      const url = `${config.serverUrl ?? "ws://localhost:8080"}/collab/${roomId}`;
      await transport.connect(url);
      syncEngine = new SyncEngine(transport);

      transport.send("join", user);
      presence.addUser(user);

      transport.on("user-joined", (data) => {
        const u = data as CollabUser;
        presence.addUser(u);
        ctx?.emit(CollabEvents.Join, u);
      });

      transport.on("user-left", (data) => {
        const u = data as { id: string };
        presence.removeUser(u.id);
        ctx?.emit(CollabEvents.Leave, u);
      });

      transport.on("cursor", (data) => {
        const cursor = data as CursorPosition;
        presence.updateCursor(cursor);
        ctx?.emit(CollabEvents.Cursor, cursor);
      });

      ctx?.emit(CollabEvents.Presence, { roomId, user });
    },

    leave() {
      transport.send("leave", {});
      transport.disconnect();
      presence.clear();
      syncEngine = null;
      ctx?.emit(CollabEvents.Leave, {});
    },

    getUsers: () => presence.getUsers(),
    getCursors: () => presence.getCursors(),

    sendOperation(op) {
      syncEngine?.applyLocal(op);
    },

    isConnected: () => transport.connected,
  };

  const plugin: MonacoPlugin = {
    id: "collab-module",
    name: "Collab Module",
    version: "1.0.0",
    description: "Real-time collaborative editing",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;
    },

    onDispose(): void {
      if (transport.connected) api.leave();
      ctx = null;
    },
  };

  return { plugin, api };
}

export type { CollabUser, CursorPosition, CollabOperation, CollabConfig, CollabModuleAPI } from "./types";
export { CollabTransport } from "./transport";
export { CRDTDocument } from "./crdt";
export { transform } from "./ot-engine";
export { PresenceTracker } from "./presence";
export { buildCursorDecorations } from "./cursor-overlay";
export { SyncEngine } from "./sync-engine";
