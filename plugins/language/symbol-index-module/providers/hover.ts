// ── Hover provider bridge ────────────────────────────────────
import type * as monacoNs from "monaco-editor";
import type { SymbolIndex } from "../types";
import { toMonacoRange } from "../types";

export function createHoverProvider(
  index: SymbolIndex,
): monacoNs.languages.HoverProvider {
  return {
    provideHover(
      model: monacoNs.editor.ITextModel,
      position: monacoNs.Position,
    ): monacoNs.languages.ProviderResult<monacoNs.languages.Hover> {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const entry =
        index.lookupAtPosition(
          model.uri.path,
          position.lineNumber - 1,
          position.column - 1,
        ) ?? index.lookup(word.word)[0];

      if (!entry) return null;

      const lang = model.getLanguageId();
      const contents: monacoNs.IMarkdownString[] = [
        { value: "```" + lang + "\n" + (entry.signature ?? entry.name) + "\n```" },
      ];

      if (entry.documentation) {
        contents.push({ value: entry.documentation });
      }

      contents.push({
        value: `*Defined in* \`${entry.filePath}:${entry.range.startLine + 1}\``,
      });

      return {
        range: toMonacoRange(entry.selectionRange),
        contents,
      };
    },
  };
}