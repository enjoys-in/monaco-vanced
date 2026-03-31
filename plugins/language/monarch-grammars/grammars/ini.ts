// ── INI Monarch tokenizer ─────────────────────────────────────
import type * as monacoNs from "monaco-editor";

export const iniTokenizer: monacoNs.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenizer: {
    root: [
      [/[;#].*$/, "comment"],
      [/\[[\w.-]+\]/, "type"],
      [/[\w.-]+(?=\s*=)/, "variable.name"],
      [/=/, "delimiter"],
      [/"[^"]*"/, "string"],
      [/'[^']*'/, "string"],
      [/\b(true|false|yes|no|on|off)\b/i, "keyword"],
      [/\d+(\.\d+)?/, "number"],
      [/\$\{[^}]+\}/, "variable"],
      [/[^\s;#="']+/, "string"],
    ],
  },
};
