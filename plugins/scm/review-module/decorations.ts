// ── Review Decorations ─────────────────────────────────────

import type { ReviewComment } from "./types";

export interface ReviewDecoration {
  readonly line: number;
  readonly commentCount: number;
  readonly latestAuthor: string;
}

export function buildReviewDecorations(comments: ReviewComment[]): ReviewDecoration[] {
  const byLine = new Map<number, ReviewComment[]>();
  for (const c of comments) {
    if (!byLine.has(c.line)) byLine.set(c.line, []);
    byLine.get(c.line)!.push(c);
  }

  return Array.from(byLine.entries()).map(([line, cs]) => ({
    line,
    commentCount: cs.length,
    latestAuthor: cs[cs.length - 1].author,
  }));
}
