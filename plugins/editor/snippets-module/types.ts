// ── Snippets-module types ───────────────────────────────────

export interface SnippetDefinition {
  /** Unique snippet name */
  name: string;
  /** Trigger prefix(es) */
  prefix: string | string[];
  /** Snippet body lines (VS Code format with $1, $2, etc.) */
  body: string | string[];
  /** Description shown in completion list */
  description?: string;
  /** Languages this snippet applies to (empty = all) */
  languages?: string[];
  /** Source (e.g. "builtin", extension id, user) */
  source?: string;
}

export interface SnippetConfig {
  /** Whether to show snippet completions */
  enabled?: boolean;
  /** Filter duplicates by prefix */
  deduplicateByPrefix?: boolean;
}

/**
 * VS Code snippet file format:
 * { "Snippet Name": { "prefix": "...", "body": [...], "description": "..." } }
 */
export type VSCodeSnippetFile = Record<
  string,
  {
    prefix: string | string[];
    body: string | string[];
    description?: string;
    scope?: string;
  }
>;
