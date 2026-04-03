// ── Type definition provider bridge ──────────────────────────
import type * as monacoNs from "monaco-editor";
import type { SymbolIndex } from "../types";
import { SymbolKind, toMonacoRange } from "../types";

export function createTypeDefinitionProvider(
  index: SymbolIndex,
  monaco: typeof monacoNs,
): monacoNs.languages.TypeDefinitionProvider {
  return {
    provideTypeDefinition(
      model: monacoNs.editor.ITextModel,
      position: monacoNs.Position,
    ): monacoNs.languages.ProviderResult<monacoNs.languages.Definition> {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const fromFile = model.uri.path;

      // Try position-based lookup first
      const atPos = index.lookupAtPosition(
        fromFile,
        position.lineNumber - 1,
        position.column - 1,
      );
      if (atPos && atPos.name === word.word) {
        return {
          uri: monaco.Uri.file(atPos.filePath),
          range: toMonacoRange(atPos.range),
        };
      }

      // Fall back to name-based lookup — prefer type/interface/class symbols
      const entries = index.lookup(word.word, fromFile);
      const typeEntries = entries.filter(
        (e) => e.kind === SymbolKind.Class || e.kind === SymbolKind.Interface || e.kind === SymbolKind.Enum || e.kind === SymbolKind.TypeParameter,
      );
      const results = typeEntries.length > 0 ? typeEntries : entries;
      if (results.length === 0) return null;

      return results.map((e) => ({
        uri: monaco.Uri.file(e.filePath),
        range: toMonacoRange(e.range),
      }));
    },
  };
}
