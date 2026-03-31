// ── Dotenv Monarch tokenizer ──────────────────────────────────
import type * as monacoNs from "monaco-editor";

export const dotenvTokenizer: monacoNs.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenizer: {
    root: [
      [/#.*$/, "comment"],
      [/[A-Z_][A-Z0-9_]*(?=\s*=)/, "variable.name"],
      [/=/, "delimiter"],
      [/"[^"]*"/, "string"],
      [/'[^']*'/, "string"],
      [/\$\{[^}]+\}/, "variable"],
      [/\$[A-Za-z_]\w*/, "variable"],
      [/[^\s#='"$]+/, "string"],
    ],
  },
};
