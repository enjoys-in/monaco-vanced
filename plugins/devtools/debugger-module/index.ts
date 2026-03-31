// ── Debugger Module — Plugin Entry ───────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type {
  Breakpoint,
  StackFrame,
  Variable,
  DebugSession,
  DebugConfig,
  DebugModuleAPI,
  DebugState,
} from "./types";
import { DAPClient } from "./dap-client";
import { BreakpointManager } from "./breakpoint-manager";
import { CallStack } from "./call-stack";
import { VariableStore } from "./variables";
import { DebugEvents } from "@core/events";

export type {
  Breakpoint,
  StackFrame,
  Variable,
  VariableScope,
  DebugSession,
  DebugConfig,
  DebugModuleAPI,
  DebugState,
} from "./types";
export type { DAPRequest, DAPResponse, DAPEvent, DAPMessage, DAPState } from "./dap-client";
export { DAPClient } from "./dap-client";
export { BreakpointManager } from "./breakpoint-manager";
export { CallStack } from "./call-stack";
export { VariableStore } from "./variables";

// ── Factory ──────────────────────────────────────────────────

export function createDebugPlugin(config: DebugConfig = {}): {
  plugin: MonacoPlugin;
  api: DebugModuleAPI;
} {
  const bpManager = new BreakpointManager();
  const callStack = new CallStack();
  const variableStore = new VariableStore();
  const dapClient = new DAPClient();
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;
  let session: DebugSession | null = null;

  function updateState(state: DebugState): void {
    if (session) {
      session.state = state;
      ctx?.emit(DebugEvents.State, { session: { ...session } });
    }
  }

  // ── API ──────────────────────────────────────────────────

  const api: DebugModuleAPI = {
    setBreakpoint(file: string, line: number, condition?: string): Breakpoint {
      const bp = bpManager.add(file, line, condition);
      ctx?.emit(DebugEvents.BreakpointSet, { breakpoint: bp });
      return bp;
    },

    removeBreakpoint(id: string): void {
      bpManager.remove(id);
      ctx?.emit(DebugEvents.BreakpointRemove, { id });
    },

    getBreakpoints(): Breakpoint[] {
      return bpManager.getAll();
    },

    async launch(launchConfig?: Record<string, unknown>): Promise<void> {
      const adapterUrl = config.adapterUrl ?? "ws://localhost:4711/dap";

      await dapClient.connect(adapterUrl);

      session = {
        id: `dbg-${Date.now()}`,
        name: "Debug Session",
        type: "node",
        state: "running",
      };

      // Initialize DAP handshake
      await dapClient.send("initialize", {
        clientID: "monaco-vanced",
        adapterID: "node",
      });

      await dapClient.send("launch", launchConfig ?? config.launchConfig ?? {});

      // Set breakpoints per file
      const allBps = bpManager.getAll();
      const byFile = new Map<string, Breakpoint[]>();
      for (const bp of allBps) {
        const arr = byFile.get(bp.file) ?? [];
        arr.push(bp);
        byFile.set(bp.file, arr);
      }

      for (const [file, bps] of byFile) {
        await dapClient.send("setBreakpoints", {
          source: { path: file },
          breakpoints: bps
            .filter((b) => b.enabled)
            .map((b) => ({ line: b.line, condition: b.condition })),
        });
      }

      await dapClient.send("configurationDone", {});
      ctx?.emit(DebugEvents.Launch, { session: { ...session } });
    },

    async continue(): Promise<void> {
      await dapClient.send("continue", { threadId: 1 });
      updateState("running");
    },

    async stepOver(): Promise<void> {
      await dapClient.send("next", { threadId: 1 });
      updateState("running");
    },

    async stepInto(): Promise<void> {
      await dapClient.send("stepIn", { threadId: 1 });
      updateState("running");
    },

    async stepOut(): Promise<void> {
      await dapClient.send("stepOut", { threadId: 1 });
      updateState("running");
    },

    getStack(): StackFrame[] {
      return callStack.getFrames();
    },

    getVariables(frameId: number): Variable[] {
      return variableStore.getVariables(frameId);
    },

    async terminate(): Promise<void> {
      await dapClient.send("disconnect", { restart: false }).catch(() => {});
      dapClient.disconnect();
      updateState("disconnected");
      callStack.clear();
      variableStore.clear();
      ctx?.emit(DebugEvents.Terminate, { sessionId: session?.id });
      session = null;
    },
  };

  // ── Plugin ─────────────────────────────────────────────────

  const plugin: MonacoPlugin = {
    id: "debugger-module",
    name: "Debugger",
    version: "1.0.0",
    description: "Debug Adapter Protocol client with breakpoints, call stack, and variable inspection",

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      // Handle DAP events from the adapter
      const unsubEvents = dapClient.onEvent((event) => {
        if (event.event === "stopped") {
          updateState("stopped");

          // Fetch stack frames
          dapClient.send("stackTrace", { threadId: 1 }).then((body) => {
            const frames = (body?.stackFrames as StackFrame[] | undefined) ?? [];
            callStack.setFrames(frames);
            ctx?.emit(DebugEvents.Stopped, { frames });
          }).catch(() => {});
        } else if (event.event === "terminated") {
          updateState("disconnected");
          ctx?.emit(DebugEvents.Terminate, { sessionId: session?.id });
        } else if (event.event === "output") {
          ctx?.emit(DebugEvents.Output, event.body);
        }
      });

      disposables.push({ dispose: unsubEvents });
    },

    onDispose() {
      dapClient.disconnect();
      bpManager.clear();
      callStack.clear();
      variableStore.clear();
      for (const d of disposables) d.dispose();
      disposables.length = 0;
      ctx = null;
      session = null;
    },
  };

  return { plugin, api };
}
