// ── Indexer Module — Basic Symbol Parser ──────────────────────
// Regex-based symbol extraction — runs on main thread as fallback
// or inside a Web Worker (worker.ts imports this).

import type { IndexedSymbol, SymbolKind } from "./types";

/** Pattern definition for language-specific symbol extraction */
interface SymbolPattern {
  regex: RegExp;
  kind: SymbolKind;
  nameGroup: number;
  containerGroup?: number;
}

/** Language-specific patterns */
const PATTERNS: Record<string, SymbolPattern[]> = {
  typescript: [
    { regex: /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g, kind: "class", nameGroup: 1 },
    { regex: /(?:export\s+)?interface\s+(\w+)/g, kind: "interface", nameGroup: 1 },
    { regex: /(?:export\s+)?type\s+(\w+)/g, kind: "typeParameter", nameGroup: 1 },
    { regex: /(?:export\s+)?enum\s+(\w+)/g, kind: "enum", nameGroup: 1 },
    { regex: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g, kind: "function", nameGroup: 1 },
    { regex: /(?:export\s+)?(?:const|let|var)\s+(\w+)/g, kind: "variable", nameGroup: 1 },
    { regex: /(?:public|private|protected|static|readonly)\s+(\w+)\s*[(:=]/g, kind: "property", nameGroup: 1 },
  ],
  javascript: [], // filled below
  python: [
    { regex: /^class\s+(\w+)/gm, kind: "class", nameGroup: 1 },
    { regex: /^def\s+(\w+)/gm, kind: "function", nameGroup: 1 },
    { regex: /^(\w+)\s*=/gm, kind: "variable", nameGroup: 1 },
  ],
  rust: [
    { regex: /(?:pub\s+)?struct\s+(\w+)/g, kind: "struct", nameGroup: 1 },
    { regex: /(?:pub\s+)?enum\s+(\w+)/g, kind: "enum", nameGroup: 1 },
    { regex: /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/g, kind: "function", nameGroup: 1 },
    { regex: /(?:pub\s+)?trait\s+(\w+)/g, kind: "interface", nameGroup: 1 },
    { regex: /(?:pub\s+)?mod\s+(\w+)/g, kind: "module", nameGroup: 1 },
    { regex: /(?:pub\s+)?const\s+(\w+)/g, kind: "constant", nameGroup: 1 },
  ],
  go: [
    { regex: /type\s+(\w+)\s+struct/g, kind: "struct", nameGroup: 1 },
    { regex: /type\s+(\w+)\s+interface/g, kind: "interface", nameGroup: 1 },
    { regex: /func\s+(\w+)/g, kind: "function", nameGroup: 1 },
    { regex: /var\s+(\w+)/g, kind: "variable", nameGroup: 1 },
    { regex: /const\s+(\w+)/g, kind: "constant", nameGroup: 1 },
  ],
};

// JS shares TS patterns
PATTERNS.javascript = PATTERNS.typescript;
PATTERNS.typescriptreact = PATTERNS.typescript;
PATTERNS.javascriptreact = PATTERNS.javascript;

/** Generic fallback patterns for unknown languages */
const FALLBACK_PATTERNS: SymbolPattern[] = [
  { regex: /(?:class|struct|interface|enum)\s+(\w+)/g, kind: "class", nameGroup: 1 },
  { regex: /(?:function|func|def|fn|sub|proc)\s+(\w+)/g, kind: "function", nameGroup: 1 },
];

/**
 * Parse a file's content and extract symbols.
 * Uses regex-based extraction — not a full AST parser.
 */
export function parseSymbols(
  path: string,
  content: string,
  languageId: string,
): IndexedSymbol[] {
  const patterns = PATTERNS[languageId] ?? FALLBACK_PATTERNS;
  const lines = content.split("\n");
  const symbols: IndexedSymbol[] = [];

  for (const pattern of patterns) {
    // Reset regex state for each pattern
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const name = match[pattern.nameGroup];
      if (!name) continue;

      // Calculate line number from character offset
      const offset = match.index;
      let line = 0;
      let col = 0;
      let pos = 0;
      for (let i = 0; i < lines.length; i++) {
        if (pos + lines[i]!.length + 1 > offset) {
          line = i + 1; // 1-based
          col = offset - pos + 1;
          break;
        }
        pos += lines[i]!.length + 1;
      }

      symbols.push({
        name,
        kind: pattern.kind,
        path,
        line,
        column: col,
        containerName: pattern.containerGroup ? match[pattern.containerGroup] : undefined,
      });
    }
  }

  return symbols;
}
