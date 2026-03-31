// ── Git Decorations ────────────────────────────────────────
// Editor gutter decorations for git diff lines.

import type { GitStatus } from "./types";

export interface GitDecoration {
  readonly line: number;
  readonly type: "added" | "modified" | "deleted";
}

const STATUS_TO_DECORATION: Record<string, GitDecoration["type"] | null> = {
  untracked: "added",
  modified: "modified",
  deleted: "deleted",
  staged: "modified",
  renamed: "modified",
  conflicted: "modified",
  unmodified: null,
};

export function getDecorationType(status: GitStatus): GitDecoration["type"] | null {
  return STATUS_TO_DECORATION[status] ?? null;
}

export function buildGutterDecorations(
  addedLines: number[],
  modifiedLines: number[],
  deletedLines: number[],
): GitDecoration[] {
  const decorations: GitDecoration[] = [];
  for (const line of addedLines) decorations.push({ line, type: "added" });
  for (const line of modifiedLines) decorations.push({ line, type: "modified" });
  for (const line of deletedLines) decorations.push({ line, type: "deleted" });
  return decorations.sort((a, b) => a.line - b.line);
}
