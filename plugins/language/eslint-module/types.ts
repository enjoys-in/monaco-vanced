// ── ESLint module types ──────────────────────────────────────

export interface ESLintConfig {
  /** ESLint rules (key → rule config) */
  rules?: Record<string, unknown>;
  /** Parser (e.g. "@typescript-eslint/parser") */
  parser?: string;
  /** Parser options */
  parserOptions?: Record<string, unknown>;
  /** Environment flags (e.g. { browser: true, es2024: true }) */
  env?: Record<string, boolean>;
  /** Globals */
  globals?: Record<string, "readonly" | "writable" | "off">;
  /** Extends preset configs */
  extends?: string | string[];
  /** Plugin names */
  plugins?: string[];
}

export interface LintMessage {
  /** Rule ID (e.g. "no-unused-vars") */
  ruleId: string | null;
  /** Error severity: 1 = warning, 2 = error */
  severity: 1 | 2;
  /** Message text */
  message: string;
  /** 1-indexed line */
  line: number;
  /** 1-indexed column */
  column: number;
  /** End line (1-indexed) */
  endLine?: number;
  /** End column (1-indexed) */
  endColumn?: number;
  /** Auto-fix info */
  fix?: LintFix;
  /** Suggestions for quick fixes */
  suggestions?: LintSuggestion[];
}

export interface LintFix {
  range: [number, number];
  text: string;
}

export interface LintSuggestion {
  desc: string;
  fix: LintFix;
}

export interface LintResult {
  /** File path or URI */
  filePath: string;
  /** Lint messages */
  messages: LintMessage[];
  /** Number of errors */
  errorCount: number;
  /** Number of warnings */
  warningCount: number;
  /** Source after all auto-fixes applied (if any) */
  output?: string;
}

export interface ESLintPluginOptions {
  /** Default ESLint config (used when no .eslintrc found) */
  config?: ESLintConfig;
  /** Auto-fix on save (default: false) */
  fixOnSave?: boolean;
  /** Debounce delay for lint-on-type in ms (default: 500) */
  debounceMs?: number;
  /** Languages to lint (default: ["javascript", "typescript", "javascriptreact", "typescriptreact"]) */
  languages?: string[];
}

export const DEFAULT_LANGUAGES = [
  "javascript",
  "typescript",
  "javascriptreact",
  "typescriptreact",
];