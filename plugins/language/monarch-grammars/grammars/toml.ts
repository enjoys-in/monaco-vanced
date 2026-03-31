// ── TOML Monarch tokenizer ────────────────────────────────────
import type * as monacoNs from "monaco-editor";

export const tomlTokenizer: monacoNs.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenizer: {
    root: [
      [/#.*$/, "comment"],
      [/\[\[[\w.-]+\]\]/, "type"],
      [/\[[\w.-]+\]/, "type"],
      [/[\w.-]+(?=\s*=)/, "variable.name"],
      [/=/, "delimiter"],
      [/"""/, "string", "@mlstring"],
      [/'''/, "string", "@mlstringlit"],
      [/"[^"]*"/, "string"],
      [/'[^']*'/, "string"],
      [/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/, "number.date"],
      [/\d+(\.\d+)?([eE][+-]?\d+)?/, "number"],
      [/\b(true|false)\b/, "keyword.constant"],
      [/[{}\[\],]/, "delimiter"],
    ],
    mlstring: [
      [/"""/, "string", "@pop"],
      [/./, "string"],
    ],
    mlstringlit: [
      [/'''/, "string", "@pop"],
      [/./, "string"],
    ],
  },
};
