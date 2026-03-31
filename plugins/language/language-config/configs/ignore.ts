// ── Ignore file language configuration (.gitignore, .dockerignore, etc.) ──
import type * as monacoNs from "monaco-editor";

export const ignoreLanguageConfig: monacoNs.languages.LanguageConfiguration = {
  comments: {
    lineComment: "#",
  },
  brackets: [],
  autoClosingPairs: [],
  surroundingPairs: [],
};
