// ── Symbol index types ───────────────────────────────────────
import type * as monacoNs from "monaco-editor";

// ── Range ────────────────────────────────────────────────────

export interface SymbolRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

// ── SymbolKind (mirrors Monaco SymbolKind numeric values) ────

export const enum SymbolKind {
  File = 0,
  Module = 1,
  Namespace = 2,
  Package = 3,
  Class = 4,
  Method = 5,
  Property = 6,
  Field = 7,
  Constructor = 8,
  Enum = 9,
  Interface = 10,
  Function = 11,
  Variable = 12,
  Constant = 13,
  String = 14,
  Number = 15,
  Boolean = 16,
  Array = 17,
  Object = 18,
  Key = 19,
  Null = 20,
  EnumMember = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25,
}

// ── SymbolEntry (what gets indexed) ──────────────────────────

export interface SymbolEntry {
  name: string;
  kind: SymbolKind;
  filePath: string;
  range: SymbolRange;
  selectionRange: SymbolRange;
  containerName?: string;
  signature?: string;
  documentation?: string;
  exportedAs?: "default" | "named" | "none";
}

// ── SymbolIndex interface ────────────────────────────────────

export interface SymbolIndex {
  indexFile(path: string, content: string, langId?: string): void;
  removeFile(path: string): void;
  lookup(name: string, fromFile?: string): SymbolEntry[];
  lookupInFile(path: string): SymbolEntry[];
  lookupWorkspace(query: string): SymbolEntry[];
  lookupAtPosition(
    path: string,
    line: number,
    col: number,
  ): SymbolEntry | null;
  clear(): void;
}

// ── Helpers ──────────────────────────────────────────────────

export function toMonacoRange(
  r: SymbolRange,
): monacoNs.IRange {
  return {
    startLineNumber: r.startLine + 1,
    startColumn: r.startColumn + 1,
    endLineNumber: r.endLine + 1,
    endColumn: r.endColumn + 1,
  };
}

export function toMonacoSymbolKind(
  k: SymbolKind,
  _symbolKindEnum: typeof monacoNs.languages.SymbolKind,
): monacoNs.languages.SymbolKind {
  // SymbolKind values match Monaco's languages.SymbolKind
  return (k as number) as monacoNs.languages.SymbolKind;
}