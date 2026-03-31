// ── Dockerfile language configuration ────────────────────────
import type * as monacoNs from "monaco-editor";

export const dockerfileLanguageConfig: monacoNs.languages.LanguageConfiguration = {
  comments: {
    lineComment: "#",
  },
  brackets: [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
  ],
  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  surroundingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  folding: {
    markers: {
      start: /^\s*#\s*region\b/,
      end: /^\s*#\s*endregion\b/,
    },
  },
};
