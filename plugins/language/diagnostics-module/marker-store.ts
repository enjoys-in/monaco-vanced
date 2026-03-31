// ── Marker store — tracks diagnostics per file URI per source ──
import type { Diagnostic, DiagnosticCounts } from "./types";

/**
 * Stores diagnostics keyed by `source::uri`.
 * Allows multiple sources to report diagnostics for the same file
 * without clobbering each other.
 */
export class MarkerStore {
  /** Map of "source::uri" → diagnostics */
  private store = new Map<string, Diagnostic[]>();

  private key(source: string, uri: string): string {
    return `${source}::${uri}`;
  }

  /** Set diagnostics from a specific source for a specific file */
  set(source: string, uri: string, diagnostics: Diagnostic[]): void {
    const k = this.key(source, uri);
    if (diagnostics.length === 0) {
      this.store.delete(k);
    } else {
      this.store.set(k, diagnostics);
    }
  }

  /** Get diagnostics from a specific source for a specific file */
  get(source: string, uri: string): Diagnostic[] {
    return this.store.get(this.key(source, uri)) ?? [];
  }

  /** Get ALL diagnostics for a file (from all sources) */
  getForUri(uri: string): Diagnostic[] {
    const result: Diagnostic[] = [];
    for (const [key, diags] of this.store) {
      if (key.endsWith(`::${uri}`)) {
        result.push(...diags);
      }
    }
    return result;
  }

  /** Get all diagnostics across all files */
  getAll(): Diagnostic[] {
    const result: Diagnostic[] = [];
    for (const diags of this.store.values()) {
      result.push(...diags);
    }
    return result;
  }

  /** Get unique URIs that have diagnostics */
  getAffectedUris(): string[] {
    const uris = new Set<string>();
    for (const key of this.store.keys()) {
      uris.add(key.split("::").slice(1).join("::"));
    }
    return [...uris];
  }

  /** Remove all diagnostics from a specific source */
  clearSource(source: string): void {
    for (const key of [...this.store.keys()]) {
      if (key.startsWith(`${source}::`)) {
        this.store.delete(key);
      }
    }
  }

  /** Remove all diagnostics for a file */
  clearUri(uri: string): void {
    for (const key of [...this.store.keys()]) {
      if (key.endsWith(`::${uri}`)) {
        this.store.delete(key);
      }
    }
  }

  /** Aggregate counts */
  getCounts(): DiagnosticCounts {
    const counts: DiagnosticCounts = { errors: 0, warnings: 0, infos: 0, hints: 0 };
    for (const diags of this.store.values()) {
      for (const d of diags) {
        switch (d.severity) {
          case "error": counts.errors++; break;
          case "warning": counts.warnings++; break;
          case "info": counts.infos++; break;
          case "hint": counts.hints++; break;
        }
      }
    }
    return counts;
  }

  clear(): void {
    this.store.clear();
  }
}
