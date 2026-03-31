// ── In-memory symbol index store ─────────────────────────────
import type { SymbolEntry, SymbolIndex, SymbolKind } from "./types";

/**
 * Fast in-memory symbol index.
 * Keyed by filePath → SymbolEntry[].
 * Also maintains a name → filePaths reverse map for workspace-wide lookup.
 */
export class IndexStore implements SymbolIndex {
  /** filePath → all symbols in that file */
  private readonly fileMap = new Map<string, SymbolEntry[]>();
  /** symbolName (lowercase) → Set<filePath> for fast cross-file lookup */
  private readonly nameIndex = new Map<string, Set<string>>();

  // ── Indexing ─────────────────────────────────────────────

  indexFile(path: string, content: string): void {
    // Remove existing symbols for this file before re-indexing
    this.removeFile(path);

    const symbols = parseSymbols(path, content);
    this.fileMap.set(path, symbols);

    // Update reverse name index
    for (const sym of symbols) {
      const key = sym.name.toLowerCase();
      let set = this.nameIndex.get(key);
      if (!set) {
        set = new Set();
        this.nameIndex.set(key, set);
      }
      set.add(path);
    }
  }

  removeFile(path: string): void {
    const existing = this.fileMap.get(path);
    if (!existing) return;

    // Clean reverse index
    for (const sym of existing) {
      const key = sym.name.toLowerCase();
      const set = this.nameIndex.get(key);
      if (set) {
        set.delete(path);
        if (set.size === 0) this.nameIndex.delete(key);
      }
    }

    this.fileMap.delete(path);
  }

  // ── Queries ──────────────────────────────────────────────

  lookup(name: string, _fromFile?: string): SymbolEntry[] {
    const results: SymbolEntry[] = [];
    const key = name.toLowerCase();
    const paths = this.nameIndex.get(key);
    if (!paths) return results;

    for (const path of paths) {
      const symbols = this.fileMap.get(path);
      if (symbols) {
        for (const s of symbols) {
          if (s.name === name) results.push(s);
        }
      }
    }
    return results;
  }

  lookupInFile(path: string): SymbolEntry[] {
    return this.fileMap.get(path) ?? [];
  }

  lookupWorkspace(query: string): SymbolEntry[] {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    const results: SymbolEntry[] = [];

    for (const symbols of this.fileMap.values()) {
      for (const s of symbols) {
        if (s.name.toLowerCase().includes(lowerQuery)) {
          results.push(s);
        }
      }
    }
    return results;
  }

  lookupAtPosition(
    path: string,
    line: number,
    col: number,
  ): SymbolEntry | null {
    const symbols = this.fileMap.get(path);
    if (!symbols) return null;

    for (const s of symbols) {
      const r = s.selectionRange;
      if (
        line >= r.startLine &&
        line <= r.endLine &&
        (line > r.startLine || col >= r.startColumn) &&
        (line < r.endLine || col <= r.endColumn)
      ) {
        return s;
      }
    }
    return null;
  }

  clear(): void {
    this.fileMap.clear();
    this.nameIndex.clear();
  }

  /** Total number of indexed files */
  get fileCount(): number {
    return this.fileMap.size;
  }

  /** Total number of indexed symbols */
  get symbolCount(): number {
    let count = 0;
    for (const symbols of this.fileMap.values()) count += symbols.length;
    return count;
  }
}

// ── Lightweight regex-based symbol parser ────────────────────
// This is a best-effort parser for common JS/TS/Python/Go/Rust patterns.
// For full accuracy, the LSP bridge module should be used instead.

const PATTERNS: Array<{
  regex: RegExp;
  kind: SymbolKind;
  nameGroup: number;
}> = [
  // TS/JS: export function foo(…
  { regex: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm, kind: 11 /* Function */, nameGroup: 1 },
  // TS/JS: export class Foo
  { regex: /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/gm, kind: 4 /* Class */, nameGroup: 1 },
  // TS/JS: export interface Foo
  { regex: /^(?:export\s+)?interface\s+(\w+)/gm, kind: 10 /* Interface */, nameGroup: 1 },
  // TS/JS: export type Foo
  { regex: /^(?:export\s+)?type\s+(\w+)/gm, kind: 25 /* TypeParameter */, nameGroup: 1 },
  // TS/JS: export enum Foo
  { regex: /^(?:export\s+)?(?:const\s+)?enum\s+(\w+)/gm, kind: 9 /* Enum */, nameGroup: 1 },
  // TS/JS: export const/let/var foo
  { regex: /^(?:export\s+)?(?:const|let|var)\s+(\w+)/gm, kind: 12 /* Variable */, nameGroup: 1 },
  // Python: def foo(
  { regex: /^(?:async\s+)?def\s+(\w+)/gm, kind: 11 /* Function */, nameGroup: 1 },
  // Python: class Foo
  { regex: /^class\s+(\w+)/gm, kind: 4 /* Class */, nameGroup: 1 },
  // Go: func Foo(
  { regex: /^func\s+(?:\([^)]*\)\s+)?(\w+)/gm, kind: 11 /* Function */, nameGroup: 1 },
  // Go: type Foo struct/interface
  { regex: /^type\s+(\w+)\s+(?:struct|interface)/gm, kind: 4 /* Class */, nameGroup: 1 },
  // Rust: fn foo(
  { regex: /^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/gm, kind: 11 /* Function */, nameGroup: 1 },
  // Rust: struct Foo
  { regex: /^(?:pub\s+)?struct\s+(\w+)/gm, kind: 22 /* Struct */, nameGroup: 1 },
  // Rust: enum Foo
  { regex: /^(?:pub\s+)?enum\s+(\w+)/gm, kind: 9 /* Enum */, nameGroup: 1 },
  // Rust: trait Foo
  { regex: /^(?:pub\s+)?trait\s+(\w+)/gm, kind: 10 /* Interface */, nameGroup: 1 },
];

function parseSymbols(filePath: string, content: string): SymbolEntry[] {
  const entries: SymbolEntry[] = [];

  for (const { regex, kind, nameGroup } of PATTERNS) {
    // Reset lastIndex for global regex
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const name = match[nameGroup];
      if (!name) continue;

      // Calculate line/col from match index
      const before = content.slice(0, match.index);
      const line = before.split("\n").length - 1;
      const lastNewline = before.lastIndexOf("\n");
      const col = match.index - lastNewline - 1;

      // Name position within the match
      const nameOffset = match[0].indexOf(name);
      const nameCol = col + nameOffset;

      entries.push({
        name,
        kind,
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