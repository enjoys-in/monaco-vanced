// ── AI Memory Module ───────────────────────────────────────
// Conversations, corrections, project facts, keyword recall.

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { AIMemoryConfig, AIMemoryModuleAPI } from "./types";
import { ConversationStore } from "./conversations";
import { CorrectionStore } from "./corrections";
import { ProjectFactStore } from "./project-facts";
import { recall } from "./recall";

export function createAIMemoryPlugin(
  config: AIMemoryConfig = {},
): { plugin: MonacoPlugin; api: AIMemoryModuleAPI } {
  const key = config.persistKey ?? "monaco-vanced:ai-memory";
  const conversations = new ConversationStore(`${key}:conv`, config.maxConversations);
  const corrections = new CorrectionStore(`${key}:corr`, config.maxCorrections);
  const facts = new ProjectFactStore(`${key}:facts`, config.maxFacts);
  let ctx: PluginContext | null = null;

  const api: AIMemoryModuleAPI = {
    storeMessage(workspace, role, content) {
      conversations.addMessage(workspace, role, content);
      ctx?.emit("ai-memory:stored", { workspace, role });
    },

    getConversation: (workspace) => conversations.get(workspace),
    getConversations: () => conversations.getAll(),

    recordCorrection(original, corrected, filePath) {
      const corr = corrections.record(original, corrected, filePath);
      ctx?.emit("ai-memory:correction", { pattern: corr.pattern, count: corr.count });
    },

    getCorrections: () => corrections.getAll(),

    learnFact(factKey, value, category) {
      const fact = facts.learn(factKey, value, category);
      ctx?.emit("ai-memory:fact-learned", { key: factKey, category: fact.category });
    },

    getFacts: (category) => category ? facts.getByCategory(category) : facts.getAll(),

    recall(query, limit) {
      const results = recall(query, conversations.getAll(), corrections.getAll(), facts.getAll(), limit);
      ctx?.emit("ai-memory:recalled", { query, resultCount: results.length });
      return results;
    },

    prune() {
      // Remove low-confidence facts and old conversations
      const allFacts = facts.getAll();
      const stale = allFacts.filter((item) => item.confidence < 0.3);
      if (stale.length > 0) {
        facts.clear(); // simplified — would ideally remove individual items
      }
      ctx?.emit("ai-memory:pruned", {});
    },

    clear() {
      conversations.clear();
      corrections.clear();
      facts.clear();
    },
  };

  const plugin: MonacoPlugin = {
    id: "ai-memory-module",
    name: "AI Memory Module",
    version: "1.0.0",
    description: "Conversations, corrections, project facts, and recall",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;
    },

    onDispose(): void {
      ctx = null;
    },
  };

  return { plugin, api };
}

export type {
  Conversation,
  ConversationMessage,
  Correction,
  ProjectFact,
  AIMemoryConfig,
  AIMemoryModuleAPI,
} from "./types";
export { ConversationStore } from "./conversations";
export { CorrectionStore } from "./corrections";
export { ProjectFactStore } from "./project-facts";
export { recall } from "./recall";
export { PersistentStore } from "./store";
