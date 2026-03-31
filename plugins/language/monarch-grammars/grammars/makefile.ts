// ── Makefile Monarch tokenizer ─────────────────────────────────
import type * as monacoNs from "monaco-editor";

export const makefileTokenizer: monacoNs.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenizer: {
    root: [
      [/#.*$/, "comment"],
      [/^[\w.-]+\s*(?::(?!=))/, "entity.name.function"],
      [/^\t/, "", "@recipe"],
      [/\$\([^)]+\)/, "variable"],
      [/\$\{[^}]+\}/, "variable"],
      [/\$[@<^?*%+]/, "variable"],
      [/\b(ifeq|ifneq|ifdef|ifndef|else|endif|define|endef|include|override|export|unexport|vpath|\.PHONY|\.DEFAULT|\.PRECIOUS|\.SUFFIXES)\b/, "keyword"],
      [/:?=/, "delimiter"],
      [/\\$/, "string.escape"],
      [/"[^"]*"/, "string"],
      [/'[^']*'/, "string"],
    ],
    recipe: [
      [/^(?!\t)/, "", "@pop"],
      [/\$\([^)]+\)/, "variable"],
      [/\$\{[^}]+\}/, "variable"],
      [/\$[@<^?*%+]/, "variable"],
      [/#.*$/, "comment"],
      [/"[^"]*"/, "string"],
      [/'[^']*'/, "string"],
      [/./, ""],
    ],
  },
};
