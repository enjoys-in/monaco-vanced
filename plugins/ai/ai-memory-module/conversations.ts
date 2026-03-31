// ── Conversations ──────────────────────────────────────────
// Per-workspace conversation history.

import type { Conversation, ConversationMessage } from "./types";
import { PersistentStore } from "./store";

export class ConversationStore {
  private store: PersistentStore<Conversation>;

  constructor(persistKey: string, maxConversations = 50) {
    this.store = new PersistentStore<Conversation>(persistKey, maxConversations);
  }

  addMessage(workspace: string, role: ConversationMessage["role"], content: string): Conversation {
    const now = Date.now();
    const message: ConversationMessage = { role, content, timestamp: now };

    const existing = this.store.find((c) => c.workspace === workspace);

    if (existing) {
      const updated: Conversation = {
        ...existing,
        messages: [...existing.messages, message],
        updatedAt: now,
      };
      this.store.update((c) => c.workspace === workspace, () => updated);
      return updated;
    }

    const conversation: Conversation = {
      id: `conv-${now}-${Math.random().toString(36).slice(2, 8)}`,
      workspace,
      messages: [message],
      createdAt: now,
      updatedAt: now,
    };
    this.store.add(conversation);
    return conversation;
  }

  get(workspace: string): Conversation | undefined {
    return this.store.find((c) => c.workspace === workspace);
  }

  getAll(): Conversation[] {
    return this.store.getAll();
  }

  clear(): void {
    this.store.clear();
  }
}
