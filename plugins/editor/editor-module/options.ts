// ── Default Monaco editor options + merge helper ────────────
import type * as monacoNs from "monaco-editor";

export const defaultEditorOptions: monacoNs.editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  fontSize: 14,
  fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Menlo, Monaco, monospace",
  fontLigatures: true,
  minimap: { enabled: true },
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  cursorBlinking: "smooth",
  cursorSmoothCaretAnimation: "on",
  bracketPairColorization: { enabled: true },
  padding: { top: 8, bottom: 8 },
  renderLineHighlight: "all",
  tabSize: 2,
  wordWrap: "off",
  lineNumbers: "on",
  folding: true,
  glyphMargin: true,
  fixedOverflowWidgets: true,
};

/**
 * Shallow-merge user overrides onto defaults.
 * Nested objects (minimap, padding, etc.) are merged one level deep.
 */
export function mergeEditorOptions(
  overrides?: monacoNs.editor.IStandaloneEditorConstructionOptions,
): monacoNs.editor.IStandaloneEditorConstructionOptions {
  if (!overrides) return { ...defaultEditorOptions };
  return { ...defaultEditorOptions, ...overrides };
}
