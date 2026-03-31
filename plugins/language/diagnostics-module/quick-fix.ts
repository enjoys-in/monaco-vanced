// ── Quick-fix code action provider ────────────────────────────
import type * as monacoNs from "monaco-editor";
import type { MarkerStore } from "./marker-store";
import type { QuickFix } from "./types";

/**
 * Creates a Monaco CodeActionProvider that serves quick fixes from the
 * diagnostics store. Registered once; dynamically reads from the MarkerStore.
 */
export function createQuickFixProvider(
  store: MarkerStore,
): monacoNs.languages.CodeActionProvider {
  return {
    provideCodeActions(
      model: monacoNs.editor.ITextModel,
      range: monacoNs.Range,
      context: monacoNs.languages.CodeActionContext,
    ): monacoNs.languages.CodeActionList {
      const uri = model.uri.toString();
      const diagnostics = store.getForUri(uri);

      const actions: monacoNs.languages.CodeAction[] = [];

      for (const diag of diagnostics) {
        // Only process diagnostics that overlap with the requested range
        if (
          diag.endLineNumber < range.startLineNumber ||
          diag.startLineNumber > range.endLineNumber
        ) {
          continue;
        }

        // Only if triggered by markers
        if (context.only !== "quickfix" && context.markers.length === 0) continue;

        if (diag.quickFixes) {
          for (const fix of diag.quickFixes) {
            actions.push(toCodeAction(fix, model.uri));
          }
        }
      }

      return { actions, dispose() {} };
    },
  };
}

function toCodeAction(
  fix: QuickFix,
  _uri: monacoNs.Uri,
): monacoNs.languages.CodeAction {
  return {
    title: fix.title,
    kind: fix.kind,
    isPreferred: fix.isPreferred,
    edit: {
      edits: fix.edits.map((e) => ({
        resource: { scheme: "file", authority: "", path: e.uri } as unknown as monacoNs.Uri,
        textEdit: {
          range: e.range,
          text: e.text,
        },
        versionId: undefined,
      })),
    },
  };
}
