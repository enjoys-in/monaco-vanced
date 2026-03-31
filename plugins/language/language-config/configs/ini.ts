// ── INI language configuration ────────────────────────────────
import type * as monacoNs from "monaco-editor";

export const iniLanguageConfig: monacoNs.languages.LanguageConfiguration = {
  comments: {
    lineComment: ";",
  },
  brackets: [
    ["[", "]"],
  ],
  autoClosingPairs: [
    { open: "[", close: "]" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  surroundingPairs: [
    { open: "[", close: "]" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
};
