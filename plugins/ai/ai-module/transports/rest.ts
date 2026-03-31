// ── REST Transport ─────────────────────────────────────────
// Simple fetch-based request/response transport.

import type { AITransport, ChatResponse, AIResponseSchema, StreamEvent, TransportConfig } from "../types";

export class RestTransport implements AITransport {
  constructor(
    private config: TransportConfig,
    private responseSchema: AIResponseSchema,
  ) {}

  async send(payload: unknown, signal?: AbortSignal): Promise<ChatResponse> {
    const headers = await this.resolveHeaders();
    const res = await this.fetchWithRetry(payload, headers, signal);
    const raw = await res.json();
    return {
      content: this.responseSchema.extractContent(raw),
      metadata: this.responseSchema.extractMetadata?.(raw),
    };
  }

  async *stream(_payload: unknown, _signal?: AbortSignal): AsyncIterable<StreamEvent> {
    // REST doesn't support streaming — do a single request and yield the full response
    const response = await this.send(_payload, _signal);
    yield { token: response.content, done: true };
  }

  private async fetchWithRetry(
    payload: unknown,
    headers: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<Response> {
    const maxRetries = this.config.retries ?? 0;
    const retryDelay = this.config.retryDelay ?? 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = this.config.timeout ?? 30000;
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Link external signal
        if (signal) {
          signal.addEventListener("abort", () => controller.abort(), { once: true });
        }

        const res = await fetch(this.config.baseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`AI request failed: ${res.status} ${res.statusText}`);
        }
        return res;
      } catch (err) {
        if (attempt === maxRetries) throw err;
        await new Promise((r) => setTimeout(r, retryDelay));
      }
    }
    throw new Error("AI request failed after retries");
  }

  private async resolveHeaders(): Promise<Record<string, string>> {
    if (!this.config.headers) return {};
    if (typeof this.config.headers === "function") {
      return await this.config.headers();
    }
    return this.config.headers;
  }

  dispose(): void {
    // No persistent resources
  }
}
