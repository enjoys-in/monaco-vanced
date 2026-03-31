// ── Language detection types ─────────────────────────────────

export interface DetectionResult {
  /** Monaco language ID */
  languageId: string;
  /** Confidence: "extension" | "filename" | "shebang" | "content" | "fallback" */
  source: DetectionSource;
}

export type DetectionSource = "extension" | "filename" | "shebang" | "content" | "fallback";

export interface DetectionRule {
  /** File extension (with dot, e.g. ".ts") */
  extensions?: string[];
  /** Exact filename matches (e.g. "Makefile", "Dockerfile") */
  filenames?: string[];
  /** Shebang patterns (matched against first line) */
  shebangs?: RegExp[];
  /** Content patterns (matched against first 512 bytes) */
  contentPatterns?: RegExp[];
}
