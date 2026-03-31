// ── VSIX Module — TextMate to Monarch Converter ─────────────
// Converts basic TextMate grammar patterns to Monaco Monarch rules.

interface TextMateGrammar {
  scopeName: string;
  patterns?: TextMatePattern[];
  repository?: Record<string, { patterns?: TextMatePattern[] }>;
}

interface TextMatePattern {
  match?: string;
  name?: string;
  begin?: string;
  end?: string;
  beginCaptures?: Record<string, { name: string }>;
  endCaptures?: Record<string, { name: string }>;
  contentName?: string;
  include?: string;
  patterns?: TextMatePattern[];
}

interface MonarchLanguage {
  tokenizer: Record<string, Array<[string | RegExp, string] | [string | RegExp, string, string]>>;
  defaultToken: string;
}

/** Convert a TextMate grammar into a basic Monarch language definition */
export function convertTextmateToMonarch(grammar: TextMateGrammar): MonarchLanguage {
  const tokenizer: MonarchLanguage["tokenizer"] = { root: [] };

  if (grammar.patterns) {
    for (const pattern of grammar.patterns) {
      convertPattern(pattern, tokenizer, "root");
    }
  }

  // Process repository
  if (grammar.repository) {
    for (const [key, repo] of Object.entries(grammar.repository)) {
      if (repo.patterns) {
        tokenizer[key] = [];
        for (const pattern of repo.patterns) {
          convertPattern(pattern, tokenizer, key);
        }
      }
    }
  }

  // Ensure root has at least a fallback
  if (tokenizer.root.length === 0) {
    tokenizer.root.push(["[^\\s]", "source"]);
  }

  return { tokenizer, defaultToken: "" };
}

function convertPattern(
  pattern: TextMatePattern,
  tokenizer: MonarchLanguage["tokenizer"],
  state: string,
): void {
  if (pattern.match && pattern.name) {
    try {
      const token = scopeToToken(pattern.name);
      // Convert PCRE-style regex to basic JS regex string
      const regex = sanitizeRegex(pattern.match);
      (tokenizer[state] ??= []).push([regex, token]);
    } catch {
      // Skip invalid patterns
    }
  }

  if (pattern.begin && pattern.end && pattern.name) {
    const token = scopeToToken(pattern.name ?? pattern.contentName ?? "");
    const subState = `${state}_${tokenizer[state]?.length ?? 0}`;
    const beginRegex = sanitizeRegex(pattern.begin);
    const endRegex = sanitizeRegex(pattern.end);

    (tokenizer[state] ??= []).push([beginRegex, token, `@${subState}`]);
    tokenizer[subState] = [
      [endRegex, token, "@pop"],
      ["[^]", token],
    ];
  }

  // Process nested patterns
  if (pattern.patterns) {
    for (const sub of pattern.patterns) {
      convertPattern(sub, tokenizer, state);
    }
  }
}

/** Map TextMate scope to Monaco token */
function scopeToToken(scope: string): string {
  const parts = scope.split(".");
  // Map common scopes
  if (parts[0] === "comment") return "comment";
  if (parts[0] === "string") return "string";
  if (parts[0] === "constant" && parts[1] === "numeric") return "number";
  if (parts[0] === "constant") return "constant";
  if (parts[0] === "keyword") return "keyword";
  if (parts[0] === "storage") return "keyword";
  if (parts[0] === "entity" && parts[1] === "name" && parts[2] === "function") return "identifier";
  if (parts[0] === "entity" && parts[1] === "name" && parts[2] === "type") return "type";
  if (parts[0] === "variable") return "variable";
  if (parts[0] === "punctuation") return "delimiter";
  if (parts[0] === "support" && parts[1] === "function") return "predefined";
  return parts[0] ?? "source";
}

/** Sanitize TextMate regex for Monarch (basic conversion) */
function sanitizeRegex(pattern: string): string {
  // Remove lookbehind/lookahead (not supported in Monarch)
  return pattern
    .replace(/\(\?<=.*?\)/g, "")
    .replace(/\(\?<!.*?\)/g, "")
    .replace(/\(\?=.*?\)/g, "")
    .replace(/\(\?!.*?\)/g, "");
}
