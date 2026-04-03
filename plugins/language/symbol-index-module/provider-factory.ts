// ── Provider factory — registers all 6 Monaco providers from the index ──
import type * as monacoNs from "monaco-editor";
import type { IDisposable } from "@core/types";
import type { SymbolIndex } from "./types";
import { toMonacoRange, toMonacoSymbolKind } from "./types";
import { createDefinitionProvider } from "./providers/definition";
import { createReferenceProvider } from "./providers/reference";
import { createDocumentSymbolProvider } from "./providers/document-symbol";
import { createHoverProvider } from "./providers/hover";
import { createRenameProvider } from "./providers/rename";
import { createTypeDefinitionProvider } from "./providers/type-definition";
import { createDeclarationProvider } from "./providers/declaration";

/**
 * Registers all 6 symbol intelligence providers for a given language.
 * Returns IDisposable[] so the plugin can clean up on destroy.
 */
export function registerAllProviders(
  monaco: typeof monacoNs,
  index: SymbolIndex,
  language: string,
): IDisposable[] {
  return [
    monaco.languages.registerDefinitionProvider(
      language,
      createDefinitionProvider(index, monaco),
    ),
    monaco.languages.registerTypeDefinitionProvider(
      language,
      createTypeDefinitionProvider(index, monaco),
    ),
    monaco.languages.registerDeclarationProvider(
      language,
      createDeclarationProvider(index, monaco),
    ),
    monaco.languages.registerReferenceProvider(
      language,
      createReferenceProvider(index, monaco),
    ),
    monaco.languages.registerDocumentSymbolProvider(
      language,
      createDocumentSymbolProvider(index, monaco),
    ),
    monaco.languages.registerHoverProvider(
      language,
      createHoverProvider(index),
    ),
    monaco.languages.registerRenameProvider(
      language,
      createRenameProvider(index, monaco),
    ),
  ];
}

/**
 * Registers language-agnostic workspace symbol provider.
 * Should be called once (not per-language).
 */
export function registerWorkspaceProvider(
  monaco: typeof monacoNs,
  index: SymbolIndex,
): IDisposable {
  // For workspace-wide symbol search we use the "*" wildcard selector
  // with a document symbol provider. Full workspace symbol support requires LSP.
  return monaco.languages.registerDocumentSymbolProvider("*", {
    provideDocumentSymbols(model) {
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
  });
}