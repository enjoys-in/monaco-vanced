// ── AI Module ──────────────────────────────────────────────
// Thin AI chat client. Configurable baseUrl, transport,
// request/response schema. No editor coupling.

import type { MonacoPlugin, PluginContext } from "@core/types";
import { AiEvents } from "@core/events";
import type {
  AIModuleAPI,
  AIPluginOptions,
  AIStatus,
  ChatMessage,
  ChatResponse,
  StreamEvent,
} from "./types";
import { AIClient } from "./client";
import { ContextOrchestrator } from "./context-orchestrator";

export function createAIPlugin(
  config: AIPluginOptions,
): { plugin: MonacoPlugin; api: AIModuleAPI; orchestrator: ContextOrchestrator } {
  const client = new AIClient(config);
  const orchestrator = new ContextOrchestrator({
    tokenBudget: config.maxTokens ?? 8000,
  });
  let ctx: PluginContext | null = null;

  const api: AIModuleAPI = {
    async chat(messages: ChatMessage[], opts?: Record<string, unknown>): Promise<ChatResponse> {
      ctx?.emit(AiEvents.Status, { state: "streaming" as AIStatus });
      try {
        const response = await client.chat(messages, opts);
        ctx?.emit(AiEvents.ChatMessage, { role: "assistant", content: response.content });
        ctx?.emit(AiEvents.Status, { state: "idle" as AIStatus });
        return response;
      } catch (err) {
        ctx?.emit(AiEvents.Error, { message: (err as Error).message });
        ctx?.emit(AiEvents.Status, { state: "error" as AIStatus });
        throw err;
      }
    },

    async chatStream(
      messages: ChatMessage[],
      onToken: (event: StreamEvent) => void,
      opts?: Record<string, unknown>,
    ): Promise<ChatResponse> {
      ctx?.emit(AiEvents.Status, { state: "streaming" as AIStatus });
      try {
        const response = await client.chatStream(
          messages,
          (event) => {
            ctx?.emit(AiEvents.Stream, event);
            onToken(event);
          },
          opts,
        );
        ctx?.emit(AiEvents.ChatMessage, { role: "assistant", content: response.content });
        ctx?.emit(AiEvents.Status, { state: "idle" as AIStatus });
        return response;
      } catch (err) {
        ctx?.emit(AiEvents.Error, { message: (err as Error).message });
        ctx?.emit(AiEvents.Status, { state: "error" as AIStatus });
        throw err;
      }
    },

    abort(): void {
      client.abort();
      ctx?.emit(AiEvents.Status, { state: "idle" as AIStatus });
    },

    getStatus(): AIStatus {
      return client.getStatus();
    },
  };

  const plugin: MonacoPlugin = {
    id: "ai-module",
    name: "AI Module",
    version: "1.0.0",
    description: "Thin AI chat client with SSE/REST/WebSocket/Socket transports",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;
      orchestrator.wireDefaults(ctx);

      // ── Register AI commands (palette + editor context menu) ──
      ctx.addAction({
        id: "ai.explain",
        label: "AI: Explain Code",
        keybindings: [],
        precondition: "editorHasSelection",
        contextMenuGroupId: "3_ai",
        contextMenuOrder: 1,
        run: () => { ctx?.emit("ai:explain", {}); },
      });

      ctx.addAction({
        id: "ai.generate",
        label: "AI: Generate Code",
        keybindings: [],
        precondition: "editorTextFocus",
        contextMenuGroupId: "3_ai",
        contextMenuOrder: 2,
        run: () => { ctx?.emit("ai:generate", {}); },
      });

      ctx.addAction({
        id: "ai.fix",
        label: "AI: Fix Code",
        keybindings: [],
        precondition: "editorHasSelection",
        contextMenuGroupId: "3_ai",
        contextMenuOrder: 3,
        run: () => { ctx?.emit("ai:fix", {}); },
      });

      // Listen for chat requests from other plugins
      ctx.addDisposable(
        ctx.on("ai:chat-request", async (data) => {
          const { messages, opts } = data as {
            messages: ChatMessage[];
            opts?: Record<string, unknown>;
          };
          try {
            const response = await api.chat(messages, opts);
            ctx?.emit("ai:chat-response", response);
          } catch {
            // Error already emitted
          }
        }),
      );
    },

    onDispose(): void {
      client.dispose();
      orchestrator.dispose();
      ctx = null;
    },
  };

  return { plugin, api, orchestrator };
}

// ── Re-exports ─────────────────────────────────────────────

export type {
  AIConfig,
  AIModuleAPI,
  AIPluginOptions,
  AIRequestSchema,
  AIResponseSchema,
  AIStatus,
  AITransport,
  ChatMessage,
  ChatResponse,
  StreamEvent,
  TransportConfig,
  TransportType,
} from "./types";

export { AIClient } from "./client";
export { defaultRequestSchema, defaultResponseSchema } from "./schema";
export { ContextOrchestrator } from "./context-orchestrator";
export {
  buildContext,
  estimateTokens,
  createEditorSource,
  createSelectionSource,
  type ContextSource,
  type BuiltContext,
} from "./context-builder";
export { RestTransport } from "./transports/rest";
export { SSETransport } from "./transports/sse";
export { WebSocketTransport } from "./transports/websocket";
export { SocketTransport } from "./transports/socket";
