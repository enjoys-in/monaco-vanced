// ── Prettier module types ────────────────────────────────────

export interface PrettierConfig {
  /** Print width (default: 80) */
  printWidth?: number;
  /** Tab width (default: 2) */
  tabWidth?: number;
  /** Use tabs instead of spaces */
  useTabs?: boolean;
  /** Use semicolons */
  semi?: boolean;
  /** Use single quotes */
  singleQuote?: boolean;
  /** Trailing commas: "all" | "es5" | "none" */
  trailingComma?: "all" | "es5" | "none";
  /** Bracket spacing in objects */
  bracketSpacing?: boolean;
  /** Bracket same line for HTML-like elements */
  bracketSameLine?: boolean;
  /** Arrow function parens: "always" | "avoid" */
  arrowParens?: "always" | "avoid";
  /** Prose wrap for markdown: "always" | "never" | "preserve" */
  proseWrap?: "always" | "never" | "preserve";
  /** HTML whitespace sensitivity: "css" | "strict" | "ignore" */
  htmlWhitespaceSensitivity?: "css" | "strict" | "ignore";
  /** End of line: "lf" | "crlf" | "cr" | "auto" */
  endOfLine?: "lf" | "crlf" | "cr" | "auto";
  /** Single attribute per line in HTML/JSX */
  singleAttributePerLine?: boolean;
}

export interface PrettierPluginOptions {
  /** Default config (used when no .prettierrc found) */
  config?: PrettierConfig;
  /** Format on save (default: true) */
  formatOnSave?: boolean;
  /** Languages to enable formatting for (default: all supported) */
  languages?: string[];
  /** URL to standalone Prettier bundle (uses CDN by default) */
  prettierUrl?: string;
  /** Map of parser plugin URLs keyed by parser name */
  parserUrls?: Record<string, string>;
}

/** Language ID → Prettier parser name mapping */
export const LANGUAGE_PARSER_MAP: Record<string, string> = {
  javascript: "babel",
  typescript: "typescript",
  javascriptreact: "babel",
  typescriptreact: "typescript",
  json: "json",
  jsonc: "json",
  html: "html",
  css: "css",
  scss: "css",
  less: "css",
  markdown: "markdown",
  yaml: "yaml",
  graphql: "graphql",
  vue: "html",
  svelte: "html",
  xml: "html",
};

export const DEFAULT_CDN_BASE = "https://cdn.jsdelivr.net/npm/prettier@3/standalone";