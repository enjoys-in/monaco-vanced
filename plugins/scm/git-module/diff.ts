// ── Diff Parser ────────────────────────────────────────────
// Parses unified diff output into structured hunks.

import type { GitDiffHunk } from "./types";

export function parseDiff(diffText: string): GitDiffHunk[] {
  const hunks: GitDiffHunk[] = [];
  const hunkRegex = /^@@\s+-(\d+),?(\d*)\s+\+(\d+),?(\d*)\s+@@/gm;
  let match: RegExpExecArray | null;

  while ((match = hunkRegex.exec(diffText)) !== null) {
    const oldStart = parseInt(match[1], 10);
    const oldLines = match[2] ? parseInt(match[2], 10) : 1;
    const newStart = parseInt(match[3], 10);
    const newLines = match[4] ? parseInt(match[4], 10) : 1;

    // Extract content until next hunk or end
    const startIdx = match.index + match[0].length;
    const nextMatch = hunkRegex.exec(diffText);
    const endIdx = nextMatch ? nextMatch.index : diffText.length;
    hunkRegex.lastIndex = nextMatch ? nextMatch.index : diffText.length;

    const content = diffText.slice(startIdx, endIdx).trim();
    hunks.push({ oldStart, oldLines, newStart, newLines, content });
  }

  return hunks;
}
