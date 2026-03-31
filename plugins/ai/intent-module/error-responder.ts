// ── Error Responder ────────────────────────────────────────
// Detects new diagnostics and emits intent signals.

export interface DiagnosticInfo {
  file: string;
  message: string;
  severity: string;
}

export class ErrorResponder {
  private seen = new Set<string>();

  /**
   * Returns true if this is a new unseen error.
   */
  report(diagnostic: DiagnosticInfo): boolean {
    const key = `${diagnostic.file}:${diagnostic.message}:${diagnostic.severity}`;
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    return true;
  }

  clear(file?: string): void {
    if (!file) {
      this.seen.clear();
      return;
    }
    for (const key of this.seen) {
      if (key.startsWith(`${file}:`)) {
        this.seen.delete(key);
      }
    }
  }
}
