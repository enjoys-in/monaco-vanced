// ── Workspace Module — Trust Manager ──────────────────────────
// Controls whether workspace roots are trusted (allow code execution etc.)

/**
 * Trust manager — tracks which workspace roots the user has trusted.
 * Untrusted roots have restricted capabilities (no terminal, no tasks, etc.)
 */
export class TrustManager {
  private trusted = new Set<string>();
  private defaultTrust: boolean;

  constructor(defaultTrust: boolean = true) {
    this.defaultTrust = defaultTrust;
  }

  /** Check if a root is trusted */
  isTrusted(rootPath: string): boolean {
    if (this.trusted.has(rootPath)) return true;
    return this.defaultTrust;
  }

  /** Set trust for a root */
  setTrusted(rootPath: string, trusted: boolean): void {
    if (trusted) {
      this.trusted.add(rootPath);
    } else {
      this.trusted.delete(rootPath);
    }
  }

  /** Remove trust record for a root */
  remove(rootPath: string): void {
    this.trusted.delete(rootPath);
  }

  /** Clear all trust records */
  clear(): void {
    this.trusted.clear();
  }
}
