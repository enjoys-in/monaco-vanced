// ── Symbol index Web Worker ──────────────────────────────────
// Offloads file parsing to a background thread so the main thread stays responsive.
// Communicates via structured-clone postMessage.
//
// Usage from main thread:
//   const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
//   worker.postMessage({ type: "index", path: "/foo.ts", content: "..." });
//   worker.onmessage = (e) => { /* e.data = { type: "indexed", path, symbols } */ };

import type { SymbolEntry } from "./types";

// ── Same regex parser as index-store (duplicated here because workers have isolated scope) ──

interface PatternDef {
  regex: RegExp;
  kind: number;
  nameGroup: number;
}

const PATTERNS: PatternDef[] = [
  { regex: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm, kind: 11, nameGroup: 1 },
  { regex: /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/gm, kind: 4, nameGroup: 1 },
  { regex: /^(?:export\s+)?interface\s+(\w+)/gm, kind: 10, nameGroup: 1 },
  { regex: /^(?:export\s+)?type\s+(\w+)/gm, kind: 25, nameGroup: 1 },
  { regex: /^(?:export\s+)?(?:const\s+)?enum\s+(\w+)/gm, kind: 9, nameGroup: 1 },
  { regex: /^(?:export\s+)?(?:const|let|var)\s+(\w+)/gm, kind: 12, nameGroup: 1 },
  { regex: /^(?:async\s+)?def\s+(\w+)/gm, kind: 11, nameGroup: 1 },
  { regex: /^class\s+(\w+)/gm, kind: 4, nameGroup: 1 },
  { regex: /^func\s+(?:\([^)]*\)\s+)?(\w+)/gm, kind: 11, nameGroup: 1 },
  { regex: /^type\s+(\w+)\s+(?:struct|interface)/gm, kind: 4, nameGroup: 1 },
  { regex: /^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/gm, kind: 11, nameGroup: 1 },
  { regex: /^(?:pub\s+)?struct\s+(\w+)/gm, kind: 22, nameGroup: 1 },
  { regex: /^(?:pub\s+)?enum\s+(\w+)/gm, kind: 9, nameGroup: 1 },
  { regex: /^(?:pub\s+)?trait\s+(\w+)/gm, kind: 10, nameGroup: 1 },
];

function parseSymbols(filePath: string, content: string): SymbolEntry[] {
  const entries: SymbolEntry[] = [];

  for (const { regex, kind, nameGroup } of PATTERNS) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const name = match[nameGroup];
      if (!name) continue;

      const before = content.slice(0, match.index);
      const line = before.split("\n").length - 1;
      const lastNewline = before.lastIndexOf("\n");
      const col = match.index - lastNewline - 1;
      const nameOffset = match[0].indexOf(name);
      const nameCol = col + nameOffset;

      entries.push({
        name,
        kind: kind as SymbolEntry["kind"],
        filePath,
        range: {
          startLine: line,
          startColumn: col,
          endLine: line,
          endColumn: col + match[0].length,
        },
        selectionRange: {
          startLine: line,
          startColumn: nameCol,
          endLine: line,
          endColumn: nameCol + name.length,
        },
        exportedAs: match[0].startsWith("export") ? "named" : "none",
      });
    }
  }

  return entries;
}

// ── Message types ────────────────────────────────────────────

export interface IndexRequest {
  type: "index";
  path: string;
  content: string;
}

export interface IndexBatchRequest {
  type: "index-batch";
  files: Array<{ path: string; content: string }>;
}

export interface IndexResponse {
  type: "indexed";
  path: string;
  symbols: SymbolEntry[];
}

export interface IndexBatchResponse {
  type: "indexed-batch";
  results: Array<{ path: string; symbols: SymbolEntry[] }>;
}

export interface ErrorResponse {
  type: "error";
  path: string;
  message: string;
}

export type WorkerRequest = IndexRequest | IndexBatchRequest;
export type WorkerResponse = IndexResponse | IndexBatchResponse | ErrorResponse;

// ── Worker message handler ───────────────────────────────────

const ctx = globalThis as unknown as Worker;

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;

  if (msg.type === "index") {
    try {
      const symbols = parseSymbols(msg.path, msg.content);
      ctx.postMessage({
        type: "indexed",
        path: msg.path,
        symbols,
      } satisfies IndexResponse);
    } catch (err) {
      ctx.postMessage({
        type: "error",
        path: msg.path,
        message: err instanceof Error ? err.message : String(err),
      } satisfies ErrorResponse);
    }
  } else if (msg.type === "index-batch") {
    const results: Array<{ path: string; symbols: SymbolEntry[] }> = [];
    for (const file of msg.files) {
      try {
        results.push({
          path: file.path,
          symbols: parseSymbols(file.path, file.content),
        });
      } catch {
        results.push({ path: file.path, symbols: [] });
      }
    }
    ctx.postMessage({
      type: "indexed-batch",
      results,
    } satisfies IndexBatchResponse);
  }
};