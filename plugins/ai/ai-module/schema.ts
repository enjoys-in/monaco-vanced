// ── Default Request/Response Schema ────────────────────────
// OpenAI-compatible schema by default. Users override via config.

import type { AIRequestSchema, AIResponseSchema, ChatMessage, StreamEvent } from "./types";

export const defaultRequestSchema: AIRequestSchema = {
  transform(messages: ChatMessage[], opts?: Record<string, unknown>): unknown {
    return {
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.name ? { name: m.name } : {}),
      })),
      ...opts,
    };
  },
};

export const defaultResponseSchema: AIResponseSchema = {
  extractContent(raw: unknown): string {
    const r = raw as Record<string, unknown>;
    // OpenAI-style: { choices: [{ message: { content } }] }
    const choices = r.choices as Array<{ message?: { content?: string } }> | undefined;
    if (choices?.[0]?.message?.content) {
      return choices[0].message.content;
    }
    // Simple: { content }
    if (typeof r.content === "string") return r.content;
    // Fallback
    return String(raw);
  },

  extractToken(chunk: unknown): StreamEvent {
    const c = chunk as Record<string, unknown>;
    // OpenAI SSE: { choices: [{ delta: { content } }] }
    const choices = c.choices as Array<{ delta?: { content?: string }; finish_reason?: string | null }> | undefined;
    if (choices?.[0]) {
      const delta = choices[0].delta?.content ?? "";
      const done = choices[0].finish_reason === "stop";
      return { token: delta, done };
    }
    // Simple: { token, done }
    if (typeof c.token === "string") {
      return { token: c.token, done: Boolean(c.done) };
    }
    return { token: "", done: true };
  },

  extractMetadata(raw: unknown): Record<string, unknown> {
    const r = raw as Record<string, unknown>;
    return {
      model: r.model,
      usage: r.usage,
      id: r.id,
    };
  },
};
