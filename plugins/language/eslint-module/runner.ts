// ── ESLint runner — lightweight regex-based linter for the browser ──
// NOTE: Full ESLint requires Node.js. This is a simplified browser-based
// linter that checks common rules via regex patterns. For full ESLint,
// use the LSP bridge module to connect to a real ESLint language server.

import type { ESLintConfig, LintMessage, LintResult } from "./types";

type RuleChecker = (
  content: string,
  lines: string[],
) => LintMessage[];

/**
 * Run lint checks against the provided source code.
 */
export function runLint(
  filePath: string,
  content: string,
  config: ESLintConfig,
): LintResult {
  const lines = content.split("\n");
  const messages: LintMessage[] = [];
  const rules = config.rules ?? {};

  for (const [ruleId, ruleConfig] of Object.entries(rules)) {
    if (ruleConfig === "off" || ruleConfig === 0) continue;

    const severity = toSeverity(ruleConfig);
    const checker = RULE_CHECKERS[ruleId];
    if (!checker) continue;

    const ruleMessages = checker(content, lines);
    for (const msg of ruleMessages) {
      msg.severity = severity;
      msg.ruleId = ruleId;
      messages.push(msg);
    }
  }

  return {
    filePath,
    messages,
    errorCount: messages.filter((m) => m.severity === 2).length,
    warningCount: messages.filter((m) => m.severity === 1).length,
  };
}

// ── Built-in rule checkers ───────────────────────────────────

const RULE_CHECKERS: Record<string, RuleChecker> = {
  "no-console": (_content, lines) => {
    const msgs: LintMessage[] = [];
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/\bconsole\.(log|warn|error|info|debug|trace)\s*\(/);
      if (match) {
        msgs.push({
          ruleId: "no-console",
          severity: 1,
          message: `Unexpected console statement (console.${match[1]})`,
          line: i + 1,
          column: (match.index ?? 0) + 1,
          endLine: i + 1,
          endColumn: (match.index ?? 0) + match[0].length + 1,
        });
      }
    }
    return msgs;
  },

  "no-debugger": (_content, lines) => {
    const msgs: LintMessage[] = [];
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/\bdebugger\b/);
      if (match) {
        msgs.push({
          ruleId: "no-debugger",
          severity: 1,
          message: "Unexpected 'debugger' statement",
          line: i + 1,
          column: (match.index ?? 0) + 1,
          endLine: i + 1,
          endColumn: (match.index ?? 0) + 9,
        });
      }
    }
    return msgs;
  },

  eqeqeq: (_content, lines) => {
    const msgs: LintMessage[] = [];
    for (let i = 0; i < lines.length; i++) {
      const regex = /(?<![=!])={2}(?!=)|!={1}(?!=)/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(lines[i])) !== null) {
        const op = match[0];
        msgs.push({
          ruleId: "eqeqeq",
          severity: 1,
          message: `Expected '${op === "==" ? "===" : "!=="}' and instead saw '${op}'`,
          line: i + 1,
          column: match.index + 1,
          endLine: i + 1,
          endColumn: match.index + op.length + 1,
          fix: {
            range: [match.index, match.index + op.length],
            text: op === "==" ? "===" : "!==",
          },
        });
      }
    }
    return msgs;
  },

  "no-empty": (_content, lines) => {
    const msgs: LintMessage[] = [];
    const joined = lines.join("\n");
    const regex = /\{[\s]*\}/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(joined)) !== null) {
      const before = joined.slice(0, match.index);
      const line = before.split("\n").length;
      const lastNewline = before.lastIndexOf("\n");
      const col = match.index - lastNewline;
      msgs.push({
        ruleId: "no-empty",
        severity: 1,
        message: "Empty block statement",
        line,
        column: col,
        endLine: line,
        endColumn: col + match[0].length,
      });
    }
    return msgs;
  },

  "no-duplicate-case": (_content, lines) => {
    const msgs: LintMessage[] = [];
    const caseValues = new Map<string, number>();
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^\s*case\s+(.+?)\s*:/);
      if (match) {
        const val = match[1].trim();
        if (caseValues.has(val)) {
          msgs.push({
            ruleId: "no-duplicate-case",
            severity: 2,
            message: `Duplicate case label '${val}'`,
            line: i + 1,
            column: (match.index ?? 0) + 1,
          });
        } else {
          caseValues.set(val, i + 1);
        }
      }
      // Reset on new switch
      if (/\bswitch\s*\(/.test(lines[i])) {
        caseValues.clear();
      }
    }
    return msgs;
  },

  "no-redeclare": (_content, lines) => {
    const msgs: LintMessage[] = [];
    const declared = new Map<string, number>();
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/\b(?:var|let|const)\s+(\w+)/);
      if (match) {
        const name = match[1];
        if (declared.has(name) && /\bvar\b/.test(lines[i])) {
          msgs.push({
            ruleId: "no-redeclare",
            severity: 2,
            message: `'${name}' is already defined`,
            line: i + 1,
            column: (match.index ?? 0) + 1,
          });
        } else {
          declared.set(name, i + 1);
        }
      }
    }
    return msgs;
  },
};

// ── Helpers ──────────────────────────────────────────────────

function toSeverity(
  config: unknown,
): 1 | 2 {
  if (config === "error" || config === 2) return 2;
  if (Array.isArray(config) && (config[0] === "error" || config[0] === 2)) return 2;
  return 1;
}