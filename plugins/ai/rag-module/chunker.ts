// ── Code-Aware Chunker ─────────────────────────────────────
// Splits files into overlapping chunks by line boundaries.

import type { Chunk } from "./types";

let nextId = 1;

export function chunkFile(
  filePath: string,
  content: string,
  language: string,
  chunkSize = 30,
  overlap = 5,
): Chunk[] {
  const lines = content.split("\n");
  const chunks: Chunk[] = [];

  if (lines.length <= chunkSize) {
    chunks.push({
      id: `chunk-${nextId++}`,
      filePath,
      content,
      startLine: 1,
      endLine: lines.length,
      language,
    });
    return chunks;
  }

  const step = Math.max(1, chunkSize - overlap);
  for (let i = 0; i < lines.length; i += step) {
    const end = Math.min(i + chunkSize, lines.length);
    const chunkLines = lines.slice(i, end);
    chunks.push({
      id: `chunk-${nextId++}`,
      filePath,
      content: chunkLines.join("\n"),
      startLine: i + 1,
      endLine: end,
      language,
    });
    if (end >= lines.length) break;
  }

  return chunks;
}
