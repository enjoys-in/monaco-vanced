// ── Terminal Module — Error Parser ────────────────────────────
// Regex-based parser for common terminal error formats.

export interface TerminalError {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning" | "info";
}

interface ErrorPattern {
  regex: RegExp;
  severity: "error" | "warning" | "info";
  extract: (match: RegExpExecArray) => Omit<TerminalError, "severity"> | null;
}

// ── Regex patterns for common error formats ──────────────────

const patterns: ErrorPattern[] = [
  // TypeScript: src/foo.ts(10,5): error TS2322: ...
  {
    regex: /^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+TS\d+:\s*(.+)$/gm,
    severity: "error",
    extract: (m) => ({
      file: m[1],
      line: parseInt(m[2], 10),
      column: parseInt(m[3], 10),
      message: m[5],
    }),
  },
  // TypeScript (tsc strict): src/foo.ts:10:5 - error TS2322: ...
  {
    regex: /^(.+?):(\d+):(\d+)\s*-\s*(error|warning)\s+TS\d+:\s*(.+)$/gm,
    severity: "error",
    extract: (m) => ({
      file: m[1],
      line: parseInt(m[2], 10),
      column: parseInt(m[3], 10),
      message: m[5],
    }),
  },
  // ESLint: /path/file.ts:10:5  error  message  rule-name
  {
    regex: /^(.+?):(\d+):(\d+)\s+(error|warning)\s+(.+?)\s{2,}\S+$/gm,
    severity: "error",
    extract: (m) => ({
      file: m[1],
      line: parseInt(m[2], 10),
      column: parseInt(m[3], 10),
      message: m[5].trim(),
    }),
  },
  // Node.js: /path/file.js:10
  //   SyntaxError: Unexpected token ...
  {
    regex: /^(.+?\.[jt]sx?):(\d+)\n\s*.+\n\s*(SyntaxError|ReferenceError|TypeError|RangeError):\s*(.+)$/gm,
    severity: "error",
    extract: (m) => ({
      file: m[1],
      line: parseInt(m[2], 10),
      column: 0,
      message: `${m[3]}: ${m[4]}`,
    }),
  },
  // Python: File "foo.py", line 10
  {
    regex: /File "(.+?)", line (\d+)(?:, in .+)?\n\s*.+\n(\w*Error):\s*(.+)/gm,
    severity: "error",
    extract: (m) => ({
      file: m[1],
      line: parseInt(m[2], 10),
      column: 0,
      message: `${m[3]}: ${m[4]}`,
    }),
  },
  // GCC/Clang: file.c:10:5: error: message
  {
    regex: /^(.+?):(\d+):(\d+):\s*(error|warning|note):\s*(.+)$/gm,
    severity: "error",
    extract: (m) => ({
      file: m[1],
      line: parseInt(m[2], 10),
      column: parseInt(m[3], 10),
      message: m[5],
    }),
  },
];

export function parseTerminalErrors(output: string): TerminalError[] {
  const errors: TerminalError[] = [];
  const seen = new Set<string>();

  for (const pattern of patterns) {
    // Reset lastIndex for global regex
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.regex.exec(output)) !== null) {
      const extracted = pattern.extract(match);
      if (!extracted) continue;

      // Determine severity from match group if available
      let severity = pattern.severity;
      const severityStr = match[4]?.toLowerCase();
      if (severityStr === "warning") severity = "warning";
      else if (severityStr === "note" || severityStr === "info") severity = "info";
      else if (severityStr === "error") severity = "error";

      const key = `${extracted.file}:${extracted.line}:${extracted.column}:${extracted.message}`;
      if (seen.has(key)) continue;
      seen.add(key);

      errors.push({ ...extracted, severity });
    }
  }

  return errors;
}
