// ── Document symbol provider bridge ──────────────────────────
import type * as monacoNs from "monaco-editor";
import type { SymbolIndex } from "../types";
import { toMonacoRange, toMonacoSymbolKind } from "../types";

export function createDocumentSymbolProvider(
  index: SymbolIndex,
  monaco: typeof monacoNs,
): monacoNs.languages.DocumentSymbolProvider {
  return {
    provideDocumentSymbols(
      model: monacoNs.editor.ITextModel,
    ): monacoNs.languages.ProviderResult<monacoNs.languages.DocumentSymbol[]> {
      const path = model.uri.path;
      const entries = index.lookupInFile(path);

      return entries.map((e) => ({
        name: e.name,
        detail: e.signature ?? "",
        kind: toMonacoSymbolKind(e.kind, monaco.languages.SymbolKind),
        range: toMonacoRange(e.range),
        selectionRange: toMonacoRange(e.selectionRange),
        tags: [],
      }));
    },
  };
}