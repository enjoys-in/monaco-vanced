// ── Editor-module types ─────────────────────────────────────
import type * as monacoNs from "monaco-editor";

export interface EditorConfig {
  /** Initial language for new models when none is detected */
  defaultLanguage?: string;
  /** Default editor options merged into every editor instance */
  editorOptions?: monacoNs.editor.IStandaloneEditorConstructionOptions;
  /** Whether to auto-dispose models when their tab closes */
  autoDisposeModels?: boolean;
}

export interface ModelState {
  uri: string;
  language: string;
  versionId: number;
  dirty: boolean;
  lineCount: number;
}
