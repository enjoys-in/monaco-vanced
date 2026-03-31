// ── Definition provider bridge ───────────────────────────────
import type * as monacoNs from "monaco-editor";
import type { SymbolIndex } from "../types";
import { toMonacoRange } from "../types";

export function createDefinitionProvider(
  index: SymbolIndex,
  monaco: typeof monacoNs,
): monacoNs.languages.DefinitionProvider {
  return {
    provideDefinition(
      model: monacoNs.editor.ITextModel,
      position: monacoNs.Position,
    ): monacoNs.languages.ProviderResult<monacoNs.languages.Definition> {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const fromFile = model.uri.path;

      // Try position-based lookup first (more precise)
      const atPos = index.lookupAtPosition(
        fromFile,
        position.lineNumber - 1,
        position.column - 1,
      );
      if (atPos && atPos.name !== word.word) {
        // Position matched a different symbol; fall through to name lookup
      } else if (atPos) {
        return {
          uri: monaco.Uri.file(atPos.filePath),
          range: toMonacoRange(atPos.range),
        };
      }

      // Name-based lookup across index
      const entries = index.lookup(word.word, fromFile);
      if (entries.length === 0) return null;

      return entries.map((e) => ({
        uri: monaco.Uri.file(e.filePath),
        range: toMonacoRange(e.range),
      }));
    },
  };
}