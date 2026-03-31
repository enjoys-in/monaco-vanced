// ── Terminal Module — Plugin Entry ────────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { TerminalSession, TerminalConfig, TerminalModuleAPI } from "./types";
import { PtyClient } from "./pty-client";

export type { TerminalSession, TerminalConfig, TerminalModuleAPI } from "./types";
export type { TerminalError } from "./error-parser";
export { PtyClient } from "./pty-client";
export { parseTerminalErrors } from "./error-parser";

// ── Factory ──────────────────────────────────────────────────

export function createTerminalPlugin(config: TerminalConfig = {}): {
  plugin: MonacoPlugin;
  api: TerminalModuleAPI;
} {
  const sessions = new Map<string, TerminalSession>();
  const clients = new Map<string, PtyClient>();
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;
  let counter = 0;

  const maxSessions = config.maxSessions ?? 10;

  // ── API ──────────────────────────────────────────────────

  const api: TerminalModuleAPI = {
    createSession(label?: string, cwd?: string): TerminalSession {
      if (sessions.size >= maxSessions) {
        throw new Error(`Max sessions (${maxSessions}) reached`);
      }

      const id = `term-${++counter}-${Date.now()}`;
      const session: TerminalSession = {
        id,
        label: label ?? `Terminal ${counter}`,
        cwd: cwd ?? "/",
        createdAt: Date.now(),
        active: sessions.size === 0,
      };

      sessions.set(id, session);

      // Create PTY client
      const pty = new PtyClient();
      pty.connect(id, config);
      clients.set(id, pty);

      ctx?.emit("terminal:create", { session });
      return session;
    },

    closeSession(id: string): void {
      const session = sessions.get(id);
      if (!session) return;

      const pty = clients.get(id);
      pty?.disconnect();
      clients.delete(id);
      sessions.delete(id);

      ctx?.emit("terminal:close", { id });

      // If active session was closed, activate the last remaining one
      if (session.active && sessions.size > 0) {
        const last = [...sessions.values()].pop()!;
        last.active = true;
      }
    },

    getSession(id: string): TerminalSession | undefined {
      return sessions.get(id);
    },

    getSessions(): TerminalSession[] {
      return [...sessions.values()];
    },

    write(id: string, data: string): void {
      const pty = clients.get(id);
      if (!pty) return;
      pty.write(data);
      ctx?.emit("terminal:data", { id, data });
    },

    onData(id: string, handler: (data: string) => void): () => void {
      const pty = clients.get(id);
      if (!pty) return () => {};
      return pty.onData(handler);
    },

    getActive(): TerminalSession | undefined {
      for (const session of sessions.values()) {
        if (session.active) return session;
      }
      return undefined;
    },

    setActive(id: string): void {
      for (const session of sessions.values()) {
        session.active = session.id === id;
      }
    },
  };

  // ── Plugin ─────────────────────────────────────────────────

  const plugin: MonacoPlugin = {
    id: "terminal-module",
    name: "Terminal",
    version: "1.0.0",
    description: "Integrated terminal with PTY backend and error parsing",

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      // Wire external events
      disposables.push(
        ctx.on("terminal:create", (data?: unknown) => {
          const d = data as { label?: string; cwd?: string } | undefined;
          api.createSession(d?.label, d?.cwd);
        }),
      );

      disposables.push(
        ctx.on("terminal:close", (data?: unknown) => {
          const d = data as { id: string } | undefined;
          if (d?.id) api.closeSession(d.id);
        }),
      );

      disposables.push(
        ctx.on("terminal:data", (data?: unknown) => {
          const d = data as { id: string; data: string } | undefined;
          if (d?.id && d.data) api.write(d.id, d.data);
        }),
      );
    },

    onDispose() {
      for (const pty of clients.values()) {
        pty.disconnect();
      }
      clients.clear();
      sessions.clear();
      for (const d of disposables) d.dispose();
      disposables.length = 0;
      ctx = null;
    },
  };

  return { plugin, api };
}
