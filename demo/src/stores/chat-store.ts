// ── Chat History Store — Dexie (IndexedDB) persistence ────
// Stores conversation history across sessions.
// Each conversation a list of messages with metadata.

import Dexie, { type EntityTable } from "dexie";

// ── Types ────────────────────────────────────────────────────

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessageRecord {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  action?: "explain" | "generate" | "fix";
  attachedFiles?: string[];
  attachedSymbols?: Array<{ name: string; kind: string; file: string; line: number }>;
  attachedSelection?: { text: string; file: string; startLine: number; endLine: number };
}

// ── Dexie DB ─────────────────────────────────────────────────

class ChatDB extends Dexie {
  conversations!: EntityTable<ChatConversation, "id">;
  messages!: EntityTable<ChatMessageRecord, "id">;

  constructor() {
    super("monaco-vanced-chat");
    this.version(1).stores({
      conversations: "id, updatedAt",
      messages: "id, conversationId, timestamp",
    });
  }
}

const db = new ChatDB();

// ── CRUD API ─────────────────────────────────────────────────

/** Create a new conversation */
export async function createConversation(title?: string): Promise<ChatConversation> {
  const conv: ChatConversation = {
    id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: title || "New Chat",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await db.conversations.add(conv);
  return conv;
}

/** Get all conversations, most recent first */
export async function listConversations(): Promise<ChatConversation[]> {
  return db.conversations.orderBy("updatedAt").reverse().toArray();
}

/** Get a single conversation by id */
export async function getConversation(id: string): Promise<ChatConversation | undefined> {
  return db.conversations.get(id);
}

/** Update conversation title or updatedAt */
export async function updateConversation(id: string, updates: Partial<Pick<ChatConversation, "title" | "updatedAt">>): Promise<void> {
  await db.conversations.update(id, { ...updates, updatedAt: updates.updatedAt ?? Date.now() });
}

/** Delete a conversation and all its messages */
export async function deleteConversation(id: string): Promise<void> {
  await db.transaction("rw", db.conversations, db.messages, async () => {
    await db.messages.where("conversationId").equals(id).delete();
    await db.conversations.delete(id);
  });
}

/** Delete all conversations */
export async function clearAllConversations(): Promise<void> {
  await db.transaction("rw", db.conversations, db.messages, async () => {
    await db.messages.clear();
    await db.conversations.clear();
  });
}

// ── Message CRUD ─────────────────────────────────────────────

/** Add a message to a conversation */
export async function addMessage(msg: ChatMessageRecord): Promise<void> {
  await db.transaction("rw", db.messages, db.conversations, async () => {
    await db.messages.add(msg);
    // Touch conversation updatedAt
    await db.conversations.update(msg.conversationId, { updatedAt: Date.now() });
  });
}

/** Get all messages for a conversation, in order */
export async function getMessages(conversationId: string): Promise<ChatMessageRecord[]> {
  return db.messages.where("conversationId").equals(conversationId).sortBy("timestamp");
}

/** Delete a specific message */
export async function deleteMessage(id: string): Promise<void> {
  await db.messages.delete(id);
}

/** Auto-title: use first user message (truncated) as title */
export function deriveTitle(content: string): string {
  const clean = content.replace(/```[\s\S]*?```/g, "").replace(/\n/g, " ").trim();
  return clean.length > 50 ? clean.slice(0, 47) + "…" : clean || "New Chat";
}
