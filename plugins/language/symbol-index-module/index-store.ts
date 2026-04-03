// ── In-memory symbol index store ─────────────────────────────
import type { SymbolEntry, SymbolIndex, SymbolKind } from "./types";
import type { CompiledSymbolPattern } from "./lang-data-fetcher";

/**
 * Fast in-memory symbol index.
 * Keyed by filePath → SymbolEntry[].
 * Also maintains a name → filePaths reverse map for workspace-wide lookup.
 *
 * Patterns are dynamic — loaded per language from CDN via lang-data-fetcher.
 */
export class IndexStore implements SymbolIndex {
  /** filePath → all symbols in that file */
  private readonly fileMap = new Map<string, SymbolEntry[]>();
  /** symbolName (lowercase) → Set<filePath> for fast cross-file lookup */
  private readonly nameIndex = new Map<string, Set<string>>();
  /** langId → compiled patterns (set externally by the plugin) */
  private readonly patternMap = new Map<string, CompiledSymbolPattern[]>();
  /** filePath → langId (so re-indexing knows which patterns to use) */
  private readonly fileLangMap = new Map<string, string>();

  // ── Pattern management ───────────────────────────────────

  /** Register compiled patterns for a language */
  setPatterns(langId: string, patterns: CompiledSymbolPattern[]): void {
    this.patternMap.set(langId, patterns);
  }

  /** Check if patterns are loaded for a language */
  hasPatterns(langId: string): boolean {
    return this.patternMap.has(langId);
  }

  /** Get all language IDs that have patterns loaded */
  getLoadedLanguages(): string[] {
    return Array.from(this.patternMap.keys());
  }

  // ── Indexing ─────────────────────────────────────────────

  indexFile(path: string, content: string, langId?: string): void {
    // Remove existing symbols for this file before re-indexing
    this.removeFile(path);

    // Track the langId for this file path
    if (langId) {
      this.fileLangMap.set(path, langId);
    }
    const resolvedLang = langId ?? this.fileLangMap.get(path);
    const patterns = resolvedLang ? this.patternMap.get(resolvedLang) : undefined;

    const symbols = patterns?.length
      ? parseWithPatterns(path, content, patterns)
      : [];
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
    this.patternMap.clear();
    this.fileLangMap.clear();
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

// ── Dynamic pattern-based symbol parser ──────────────────────
// Uses patterns fetched from CDN per language. No hardcoded regexes.

function parseWithPatterns(
  filePath: string,
  content: string,
  patterns: CompiledSymbolPattern[],
): SymbolEntry[] {
  const entries: SymbolEntry[] = [];

  for (const { regex, captureGroup, kind } of patterns) {
    // Reset lastIndex for global regex
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const name = match[captureGroup];
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
        kind: kind as SymbolKind,
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