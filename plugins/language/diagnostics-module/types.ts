// ── Diagnostics module types ─────────────────────────────────
import type * as monacoNs from "monaco-editor";

export type DiagnosticSeverity = "error" | "warning" | "info" | "hint";

export interface Diagnostic {
  /** Source of the diagnostic (e.g. "eslint", "typescript", "lsp") */
  source: string;
  /** File URI */
  uri: string;
  /** Severity level */
  severity: DiagnosticSeverity;
  /** Error/warning message */
  message: string;
  /** Start line (1-based) */
  startLineNumber: number;
  /** Start column (1-based) */
  startColumn: number;
  /** End line (1-based) */
  endLineNumber: number;
  /** End column (1-based) */
  endColumn: number;
  /** Optional error code (e.g. "no-unused-vars", "TS2345") */
  code?: string;
  /** Related information */
  relatedInformation?: DiagnosticRelated[];
  /** Available quick fixes */
  quickFixes?: QuickFix[];
}

export interface DiagnosticRelated {
  uri: string;
  message: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export interface QuickFix {
  title: string;
  kind: string;
  edits: QuickFixEdit[];
  isPreferred?: boolean;
}

export interface QuickFixEdit {
  uri: string;
  range: monacoNs.IRange;
  text: string;
}

export interface DiagnosticCounts {
  errors: number;
  warnings: number;
  infos: number;
  hints: number;
}

export function toMonacoSeverity(
  severity: DiagnosticSeverity,
  MarkerSeverity: typeof monacoNs.MarkerSeverity,
): monacoNs.MarkerSeverity {
  switch (severity) {
    case "error": return MarkerSeverity.Error;
    case "warning": return MarkerSeverity.Warning;
    case "info": return MarkerSeverity.Info;
    case "hint": return MarkerSeverity.Hint;
  }
}
