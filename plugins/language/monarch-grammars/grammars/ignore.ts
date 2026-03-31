// ── Ignore file Monarch tokenizer (.gitignore, etc.) ──────────
import type * as monacoNs from "monaco-editor";

export const ignoreTokenizer: monacoNs.languages.IMonarchLanguage = {
  defaultToken: "string",
  tokenizer: {
    root: [
      [/#.*$/, "comment"],
      [/!/, "keyword"],
      [/\*\*/, "keyword.operator"],
      [/\*/, "keyword.operator"],
      [/\?/, "keyword.operator"],
      [/\//, "delimiter"],
    ],
  },
};
