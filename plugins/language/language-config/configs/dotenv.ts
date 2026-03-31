// ── Dotenv language configuration ─────────────────────────────
import type * as monacoNs from "monaco-editor";

export const dotenvLanguageConfig: monacoNs.languages.LanguageConfiguration = {
  comments: {
    lineComment: "#",
  },
  brackets: [],
  autoClosingPairs: [
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  surroundingPairs: [
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
};
