// ── AI Memory Module Types ─────────────────────────────────

export interface Conversation {
  readonly id: string;
  readonly workspace: string;
  readonly messages: ConversationMessage[];
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface ConversationMessage {
  readonly role: "user" | "assistant" | "system";
  readonly content: string;
  readonly timestamp: number;
}

export interface Correction {
  readonly id: string;
  readonly original: string;
  readonly corrected: string;
  readonly filePath: string;
  readonly pattern: string;
  readonly count: number;
  readonly createdAt: number;
}

export interface ProjectFact {
  readonly id: string;
  readonly key: string;
  readonly value: string;
  readonly category: "convention" | "tooling" | "endpoint" | "pattern" | "dependency" | "custom";
  readonly confidence: number; // 0–1
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface AIMemoryConfig {
  readonly persistKey?: string;
  readonly maxConversations?: number;
  readonly maxCorrections?: number;
  readonly maxFacts?: number;
}

export interface AIMemoryModuleAPI {
  storeMessage(workspace: string, role: ConversationMessage["role"], content: string): void;
  getConversation(workspace: string): Conversation | undefined;
  getConversations(): Conversation[];
  recordCorrection(original: string, corrected: string, filePath: string): void;
  getCorrections(): Correction[];
  learnFact(key: string, value: string, category?: ProjectFact["category"]): void;
  getFacts(category?: ProjectFact["category"]): ProjectFact[];
  recall(query: string, limit?: number): Array<{ type: "conversation" | "correction" | "fact"; content: string; score: number }>;
  prune(): void;
  clear(): void;
}
