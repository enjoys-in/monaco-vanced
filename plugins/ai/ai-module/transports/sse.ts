// ── SSE Transport ──────────────────────────────────────────
// Server-Sent Events for streaming AI responses.

import type { AITransport, ChatResponse, AIResponseSchema, StreamEvent, TransportConfig } from "../types";

export class SSETransport implements AITransport {
  constructor(
    private config: TransportConfig,
    private responseSchema: AIResponseSchema,
  ) {}

  async send(payload: unknown, signal?: AbortSignal): Promise<ChatResponse> {
    // Collect all tokens from stream into a single response
    let content = "";
    let metadata: Record<string, unknown> | undefined;
    for await (const event of this.stream(payload, signal)) {
      content += event.token;
      if (event.done) break;
    }
    return { content, metadata };
  }

  async *stream(payload: unknown, signal?: AbortSignal): AsyncIterable<StreamEvent> {
    const headers = await this.resolveHeaders();
    const controller = new AbortController();
    const timeout = this.config.timeout ?? 60000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    if (signal) {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    try {
      const res = await fetch(this.config.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`SSE request failed: ${res.status} ${res.statusText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body for SSE stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") {
            if (trimmed === "data: [DONE]") {
              yield { token: "", done: true };
              return;
            }
            continue;
          }
          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const event = this.responseSchema.extractToken
                ? this.responseSchema.extractToken(json)
                : { token: String(json), done: false };
              yield event;
              if (event.done) return;
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
      yield { token: "", done: true };
    } finally {
      clearTimeout(timeoutId);
    }
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
