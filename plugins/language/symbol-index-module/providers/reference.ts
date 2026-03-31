// ── Reference provider bridge ────────────────────────────────
import type * as monacoNs from "monaco-editor";
import type { SymbolIndex } from "../types";
import { toMonacoRange } from "../types";

export function createReferenceProvider(
  index: SymbolIndex,
  monaco: typeof monacoNs,
): monacoNs.languages.ReferenceProvider {
  return {
    provideReferences(
      model: monacoNs.editor.ITextModel,
      position: monacoNs.Position,
      _context: monacoNs.languages.ReferenceContext,
    ): monacoNs.languages.ProviderResult<monacoNs.languages.Location[]> {
      const word = model.getWordAtPosition(position);
      if (!word) return [];

      const entries = index.lookupWorkspace(word.word);

      // Filter to exact name matches
      return entries
        .filter((e) => e.name === word.word)
        .map((e) => ({
          uri: monaco.Uri.file(e.filePath),
          range: toMonacoRange(e.selectionRange),
        }));
    },
  };
}