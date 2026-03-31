// ── AI Client ──────────────────────────────────────────────
// Core client that wraps the transport layer.

import type {
  AIConfig,
  AIStatus,
  AITransport,
  ChatMessage,
  ChatResponse,
  StreamEvent,
} from "./types";
import { defaultRequestSchema, defaultResponseSchema } from "./schema";
import { RestTransport } from "./transports/rest";
import { SSETransport } from "./transports/sse";
import { WebSocketTransport } from "./transports/websocket";
import { SocketTransport } from "./transports/socket";

export class AIClient {
  private transport: AITransport;
  private config: AIConfig;
  private abortController: AbortController | null = null;
  private status: AIStatus = "idle";

  constructor(config: AIConfig) {
    this.config = config;
    const responseSchema = config.responseSchema ?? defaultResponseSchema;

    switch (config.transport) {
      case "rest":
        this.transport = new RestTransport(config.transportConfig, responseSchema);
        break;
      case "sse":
        this.transport = new SSETransport(config.transportConfig, responseSchema);
        break;
      case "websocket":
        this.transport = new WebSocketTransport(config.transportConfig, responseSchema);
        break;
      case "socket":
        this.transport = new SocketTransport(config.transportConfig, responseSchema);
        break;
      default:
        this.transport = new RestTransport(config.transportConfig, responseSchema);
    }
  }

  async chat(messages: ChatMessage[], opts?: Record<string, unknown>): Promise<ChatResponse> {
    const payload = this.buildPayload(messages, opts);
    this.abortController = new AbortController();
    this.status = "streaming";

    try {
      const response = await this.transport.send(payload, this.abortController.signal);
      this.status = "idle";
      return response;
    } catch (err) {
      this.status = "error";
      throw err;
    } finally {
      this.abortController = null;
    }
  }

  async chatStream(
    messages: ChatMessage[],
    onToken: (event: StreamEvent) => void,
    opts?: Record<string, unknown>,
  ): Promise<ChatResponse> {
    const payload = this.buildPayload(messages, opts);
    this.abortController = new AbortController();
    this.status = "streaming";

    let content = "";
    try {
      for await (const event of this.transport.stream(payload, this.abortController.signal)) {
        content += event.token;
        onToken(event);
        if (event.done) break;
      }
      this.status = "idle";
      return { content };
    } catch (err) {
      this.status = "error";
      throw err;
    } finally {
      this.abortController = null;
    }
  }

  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.status = "idle";
  }

  getStatus(): AIStatus {
    return this.status;
  }

  private buildPayload(
    messages: ChatMessage[],
    opts?: Record<string, unknown>,
  ): unknown {
    const schema = this.config.requestSchema ?? defaultRequestSchema;

    // Prepend system prompt if configured
    let allMessages = messages;
    if (this.config.systemPrompt) {
      allMessages = [
        { role: "system" as const, content: this.config.systemPrompt },
        ...messages,
      ];
    }

    const mergedOpts: Record<string, unknown> = { ...opts };
    if (this.config.model) mergedOpts.model = this.config.model;
    if (this.config.maxTokens) mergedOpts.max_tokens = this.config.maxTokens;
    if (this.config.temperature !== undefined) mergedOpts.temperature = this.config.temperature;

    return schema.transform(allMessages, mergedOpts);
  }

  dispose(): void {
    this.abort();
    this.transport.dispose();
  }
}
