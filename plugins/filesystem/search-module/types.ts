// ── Search Module — Shared Types ──────────────────────────────
// Full-text and semantic search across workspace files.
// Events: search:query, search:results, search:replace

// ── Search query ──────────────────────────────────────────────

export interface SearchQuery {
  /** Search text or regex pattern */
  pattern: string;
  /** Treat pattern as regex (default: false) */
  isRegex?: boolean;
  /** Case-sensitive match (default: false) */
  caseSensitive?: boolean;
  /** Match whole words only (default: false) */
  wholeWord?: boolean;
  /** File glob include patterns (e.g. ["*.ts", "src/**"]) */
  include?: string[];
  /** File glob exclude patterns */
  exclude?: string[];
  /** Max results (default: 1000) */
  maxResults?: number;
  /** Scope search to a specific workspace root */
  rootPath?: string;
}

// ── Search result ─────────────────────────────────────────────

export interface SearchMatch {
  /** Line number (1-based) */
  line: number;
  /** Column number (1-based) */
  column: number;
  /** Length of the matched text */
  length: number;
  /** The line of text containing the match */
  lineContent: string;
  /** Context: lines before the match */
  contextBefore?: string[];
  /** Context: lines after the match */
  contextAfter?: string[];
}

export interface SearchFileResult {
  path: string;
  matches: SearchMatch[];
}

export interface SearchResults {
  query: SearchQuery;
  files: SearchFileResult[];
  totalMatches: number;
  duration: number;
  truncated: boolean;
}

// ── Replace ───────────────────────────────────────────────────

export interface ReplaceRequest {
  query: SearchQuery;
  replacement: string;
  /** Only replace in these specific files (if undefined, replace all) */
  paths?: string[];
  /** Preview mode — return changes without applying (default: false) */
  preview?: boolean;
}

export interface ReplaceChange {
  path: string;
  line: number;
  original: string;
  replaced: string;
}

export interface ReplaceResult {
  changes: ReplaceChange[];
  totalReplaced: number;
  filesAffected: number;
}

// ── Semantic search ───────────────────────────────────────────

export interface SemanticSearchQuery {
  /** Natural language query */
  query: string;
  /** Max results (default: 10) */
  limit?: number;
  /** Minimum similarity score (0-1, default: 0.5) */
  threshold?: number;
  /** Scope to file types */
  fileTypes?: string[];
}

export interface SemanticSearchResult {
  path: string;
  line: number;
  content: string;
  score: number;
}

// ── Plugin options ────────────────────────────────────────────

export interface SearchPluginOptions {
  /** Number of context lines above/below each match (default: 2) */
  contextLines?: number;
  /** Max files to search (default: 10000) */
  maxFiles?: number;
  /** Enable semantic search (requires rag-module, default: false) */
  enableSemantic?: boolean;
}
