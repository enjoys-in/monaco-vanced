// ── AI Chat — Shared Types ───────────────────────────────────

import type { IndexerModuleAPI, IndexedSymbol, SymbolQuery } from "@enjoys/monaco-vanced/filesystem/indexer-module";

// ── Event Bus shape ──────────────────────────────────────────
export interface ChatEventBus {
  emit(ev: string, payload: unknown): void;
  on(ev: string, fn: (p: unknown) => void): void;
  off(ev: string, fn: (p: unknown) => void): void;
}

// ── AI API ───────────────────────────────────────────────────
export interface ChatAiApi {
  chat(messages: { role: string; content: string }[], opts?: Record<string, unknown>): Promise<{ content: string; metadata?: Record<string, unknown> }>;
  abort(): void;
  getStatus(): string;
}

// ── Indexer API (re-export relevant subset) ──────────────────
export type ChatIndexerApi = Pick<IndexerModuleAPI, "query" | "getFileSymbols" | "isReady">;
export type { IndexedSymbol, SymbolQuery };

// ── Attached symbol ──────────────────────────────────────────
export interface AttachedSymbol {
  name: string;
  kind: string;
  file: string;
  line: number;
}

// ── Selection attachment ─────────────────────────────────────
export interface AttachedSelection {
  text: string;
  file: string;
  startLine: number;
  endLine: number;
}

// ── Chat message ─────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  action?: ChatAction;
  attachedFiles?: string[];
  attachedSymbols?: AttachedSymbol[];
  attachedSelection?: AttachedSelection;
}

// ── Chat action (slash command actions) ──────────────────────
export type ChatAction = "explain" | "generate" | "fix";

// ── File entry ───────────────────────────────────────────────
export interface ChatFile {
  uri: string;
  name: string;
  content?: string;
}

// ── Slash command definition ─────────────────────────────────
export interface SlashCommand {
  cmd: string;
  description: string;
  action: ChatAction | undefined;
  color: string;
}

// ── Suggestion prompt ────────────────────────────────────────
export interface SuggestionPrompt {
  label: string;
  icon: string;
  prompt: string;
}

// ── Mention item (unified for file + symbol) ─────────────────
export interface MentionItem {
  id: string;
  label: string;
  secondary: string;
  kind: "file" | "symbol";
  color: string;
  _sym?: { name: string; kind: string; path: string; line: number };
}

// ── Props ────────────────────────────────────────────────────
export interface AiChatProps {
  eventBus: ChatEventBus;
  aiApi: ChatAiApi;
  indexerApi?: ChatIndexerApi;
  visible: boolean;
  onClose: () => void;
  files?: ChatFile[];
}
