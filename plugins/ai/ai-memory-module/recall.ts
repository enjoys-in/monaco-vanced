// ── Recall ─────────────────────────────────────────────────
// Keyword-based retrieval across conversations, corrections, facts.

import type { Conversation, Correction, ProjectFact } from "./types";

export interface RecallResult {
  type: "conversation" | "correction" | "fact";
  content: string;
  score: number;
}

/**
 * Simple keyword-based recall (no embeddings required).
 * Scores based on keyword frequency overlap.
 */
export function recall(
  query: string,
  conversations: Conversation[],
  corrections: Correction[],
  facts: ProjectFact[],
  limit = 10,
): RecallResult[] {
  const keywords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const results: RecallResult[] = [];

  // Score conversations
  for (const conv of conversations) {
    const text = conv.messages.map((m) => m.content).join(" ");
    const score = scoreText(text, keywords);
    if (score > 0) {
      results.push({
        type: "conversation",
        content: conv.messages.slice(-5).map((m) => `${m.role}: ${m.content}`).join("\n"),
        score,
      });
    }
  }

  // Score corrections
  for (const corr of corrections) {
    const text = `${corr.original} ${corr.corrected} ${corr.filePath}`;
    const score = scoreText(text, keywords) * (1 + corr.count * 0.1);
    if (score > 0) {
      results.push({
        type: "correction",
        content: `${corr.pattern} (${corr.filePath}, count: ${corr.count})`,
        score,
      });
    }
  }

  // Score facts
  for (const fact of facts) {
    const text = `${fact.key} ${fact.value} ${fact.category}`;
    const score = scoreText(text, keywords) * fact.confidence;
    if (score > 0) {
      results.push({
        type: "fact",
        content: `${fact.key}: ${fact.value} [${fact.category}]`,
        score,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

function scoreText(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let matches = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) matches++;
  }
  return keywords.length > 0 ? matches / keywords.length : 0;
}
