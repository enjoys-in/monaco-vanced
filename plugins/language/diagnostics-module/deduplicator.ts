// ── Diagnostic deduplicator — merges overlapping diagnostics from multiple sources ──
import type { Diagnostic } from "./types";

/**
 * When multiple sources report the same error (e.g. ESLint + LSP both flag
 * an unused variable), this deduplicates by message + range overlap.
 */
export function deduplicateDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  const seen = new Map<string, Diagnostic>();

  for (const diag of diagnostics) {
    const key = dedupKey(diag);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, diag);
    } else {
      // Prefer the one with quick fixes, or the more severe one
      if (
        (diag.quickFixes?.length ?? 0) > (existing.quickFixes?.length ?? 0) ||
        severityRank(diag.severity) > severityRank(existing.severity)
      ) {
        seen.set(key, diag);
      }
    }
  }

  return [...seen.values()];
}

function dedupKey(d: Diagnostic): string {
  return `${d.startLineNumber}:${d.startColumn}-${d.endLineNumber}:${d.endColumn}::${d.message}`;
}

function severityRank(s: Diagnostic["severity"]): number {
  switch (s) {
    case "error": return 4;
    case "warning": return 3;
    case "info": return 2;
    case "hint": return 1;
  }
}
