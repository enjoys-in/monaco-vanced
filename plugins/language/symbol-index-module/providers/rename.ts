// ── Rename provider bridge ───────────────────────────────────
import type * as monacoNs from "monaco-editor";
import type { SymbolIndex } from "../types";
import { toMonacoRange } from "../types";

export function createRenameProvider(
  index: SymbolIndex,
  monaco: typeof monacoNs,
): monacoNs.languages.RenameProvider {
  return {
    resolveRenameLocation(
      model: monacoNs.editor.ITextModel,
      position: monacoNs.Position,
    ): monacoNs.languages.ProviderResult<
      monacoNs.languages.RenameLocation & monacoNs.languages.Rejection
    > {
      const entry = index.lookupAtPosition(
        model.uri.path,
        position.lineNumber - 1,
        position.column - 1,
      );
      if (!entry) {
        return {
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column,
          ),
          text: "",
          rejectReason: "No symbol at this position",
        };
      }
      return {
        range: toMonacoRange(entry.selectionRange),
        text: entry.name,
      };
    },

    provideRenameEdits(
      model: monacoNs.editor.ITextModel,
      position: monacoNs.Position,
      newName: string,
    ): monacoNs.languages.ProviderResult<
      monacoNs.languages.WorkspaceEdit & monacoNs.languages.Rejection
    > {
      const word = model.getWordAtPosition(position);
      if (!word) return { edits: [] };

      const refs = index.lookupWorkspace(word.word).filter(
        (e) => e.name === word.word,
      );

      const editsByUri = new Map<
        string,
        monacoNs.languages.IWorkspaceTextEdit[]
      >();

      for (const entry of refs) {
        const uriStr = monaco.Uri.file(entry.filePath).toString();
        let edits = editsByUri.get(uriStr);
        if (!edits) {
          edits = [];
          editsByUri.set(uriStr, edits);
        }
        edits.push({
          resource: monaco.Uri.file(entry.filePath),
          textEdit: {
            range: toMonacoRange(entry.selectionRange),
            text: newName,
          },
          versionId: undefined,
        });
      }

      const allEdits: monacoNs.languages.IWorkspaceTextEdit[] = [];
      for (const edits of editsByUri.values()) {
        allEdits.push(...edits);
      }

      return { edits: allEdits };
    },
  };
}