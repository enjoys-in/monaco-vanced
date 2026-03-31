// ── Workspace symbol provider bridge ─────────────────────────
import type * as monacoNs from "monaco-editor";
import type { SymbolIndex } from "../types";
import { toMonacoRange, toMonacoSymbolKind } from "../types";

/**
 * Returns an object compatible with Monaco's workspace symbol provider shape.
 * Monaco versions vary on whether they expose `WorkspaceSymbolProvider` as a
 * named type — we use the structural shape instead.
 */
export function createWorkspaceSymbolProvider(
  index: SymbolIndex,
  monaco: typeof monacoNs,
) {
  return {
    provideWorkspaceSymbols(
      query: string,
    ) {
      if (!query) return [];

      const results = index.lookupWorkspace(query);

      return results.map((e) => ({
        name: e.name,
        kind: toMonacoSymbolKind(e.kind, monaco.languages.SymbolKind),
        containerName: e.containerName ?? "",
        location: {
          uri: monaco.Uri.file(e.filePath),
          range: toMonacoRange(e.range),
        },
        tags: [],
      }));
    },
  };
}