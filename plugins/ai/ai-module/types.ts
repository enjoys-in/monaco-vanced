// ── AI Module Types ────────────────────────────────────────
// Core AI client types: transports, messages, schemas, config.

export type TransportType = "sse" | "rest" | "websocket" | "socket";
export type AIStatus = "idle" | "streaming" | "error";

export interface ChatMessage {
  readonly role: "user" | "assistant" | "system";
  readonly content: string;
  readonly name?: string;
  readonly timestamp?: number;
}

export interface AIRequestSchema {
  /** Transform messages into the shape the backend expects */
  transform(messages: ChatMessage[], opts?: Record<string, unknown>): unknown;
}

export interface AIResponseSchema {
  /** Extract response content from backend response */
  extractContent(raw: unknown): string;
  /** Extract streaming token from chunk */
  extractToken?(chunk: unknown): { token: string; done: boolean };
  /** Extract metadata from response */
  extractMetadata?(raw: unknown): Record<string, unknown>;
}

export interface TransportConfig {
  /** Base URL for the AI endpoint */
  readonly baseUrl: string;
  /** Default headers (auth tokens, content-type, etc.) */
  readonly headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
  /** Request timeout in ms (default: 30000) */
  readonly timeout?: number;
  /** Retry count on failure (default: 0) */
  readonly retries?: number;
  /** Retry delay in ms (default: 1000) */
  readonly retryDelay?: number;
}

export interface AIConfig {
  readonly transport: TransportType;
  readonly transportConfig: TransportConfig;
  readonly requestSchema?: AIRequestSchema;
  readonly responseSchema?: AIResponseSchema;
  /** Model name passed to backend */
  readonly model?: string;
  /** System prompt prepended to messages */
  readonly systemPrompt?: string;
  /** Max tokens per request */
  readonly maxTokens?: number;
  /** Temperature 0-2 */
  readonly temperature?: number;
}

export interface StreamEvent {
  readonly token: string;
  readonly done: boolean;
}

export interface ChatResponse {
  readonly content: string;
  readonly metadata?: Record<string, unknown>;
}

export interface AITransport {
  send(payload: unknown, signal?: AbortSignal): Promise<ChatResponse>;
  stream(payload: unknown, signal?: AbortSignal): AsyncIterable<StreamEvent>;
  dispose(): void;
}

export interface AIModuleAPI {
  chat(messages: ChatMessage[], opts?: Record<string, unknown>): Promise<ChatResponse>;
  chatStream(
    messages: ChatMessage[],
    onToken: (event: StreamEvent) => void,
    opts?: Record<string, unknown>,
  ): Promise<ChatResponse>;
  abort(): void;
  getStatus(): AIStatus;
}

export interface AIPluginOptions extends AIConfig {}
