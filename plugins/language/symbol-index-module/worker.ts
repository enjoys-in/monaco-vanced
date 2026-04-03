// ── Symbol index Web Worker ──────────────────────────────────
// Offloads file parsing to a background thread so the main thread stays responsive.
// Communicates via structured-clone postMessage.
//
// Patterns are provided dynamically per language from the main thread.
// The worker caches compiled patterns in memory for the session.
//
// Usage from main thread:
//   const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
//   worker.postMessage({ type: "set-patterns", langId: "typescript", patterns: [...] });
//   worker.postMessage({ type: "index", path: "/foo.ts", content: "...", langId: "typescript" });
//   worker.onmessage = (e) => { /* e.data = { type: "indexed", path, symbols } */ };

import type { SymbolEntry } from "./types";

// ── CDN pattern shape (sent from main thread) ───────────────

interface RawPattern {
  name: string;
  pattern: string;
  captureGroup: number;
  kind: number;
  type: string;
}

interface CompiledPattern {
  regex: RegExp;
  captureGroup: number;
  kind: number;
}

/** langId → compiled patterns */
const patternCache = new Map<string, CompiledPattern[]>();

function compilePatterns(raw: RawPattern[]): CompiledPattern[] {
  const compiled: CompiledPattern[] = [];
  for (const p of raw) {
    try {
      compiled.push({
        regex: new RegExp(p.pattern, "gm"),
        captureGroup: p.captureGroup,
        kind: p.kind,
      });
    } catch {
      // Skip invalid regex
    }
  }
  return compiled;
}

function getPatterns(langId: string): CompiledPattern[] {
  return patternCache.get(langId) ?? [];
}

// ── Parser ───────────────────────────────────────────────────

function parseSymbols(filePath: string, content: string, langId: string): SymbolEntry[] {
  const patterns = getPatterns(langId);
  if (!patterns.length) return [];

  const entries: SymbolEntry[] = [];

  for (const { regex, captureGroup, kind } of patterns) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const name = match[captureGroup];
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
        exportedAs: match[0].includes("export") ? "named" : "none",
      });
    }
  }

  return entries;
}

// ── Message types ────────────────────────────────────────────

export interface SetPatternsRequest {
  type: "set-patterns";
  langId: string;
  patterns: RawPattern[];
}

export interface IndexRequest {
  type: "index";
  path: string;
  content: string;
  langId: string;
}

export interface IndexBatchRequest {
  type: "index-batch";
  files: Array<{ path: string; content: string; langId: string }>;
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

export type WorkerRequest = SetPatternsRequest | IndexRequest | IndexBatchRequest;
export type WorkerResponse = IndexResponse | IndexBatchResponse | ErrorResponse;

// ── Worker message handler ───────────────────────────────────

const ctx = globalThis as unknown as Worker;

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;

  if (msg.type === "set-patterns") {
    const compiled = compilePatterns(msg.patterns);
    patternCache.set(msg.langId, compiled);
    return;
  }

  if (msg.type === "index") {
    try {
      const symbols = parseSymbols(msg.path, msg.content, msg.langId);
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
          symbols: parseSymbols(file.path, file.content, file.langId),
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