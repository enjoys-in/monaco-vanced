// ── LSP Bridge Module — V2 Provider Registration (24 Monaco Providers) ──
// See context/lsp-bridge-module.txt Section 8
//
// Registers 24 Monaco language providers. Each provider:
//   1. Converts Monaco position/range → LSP format (via converters)
//   2. Calls client.request(method, params)
//   3. Converts LSP response → Monaco format (via converters)
// All providers are guarded by server capabilities.

import type * as monacoNs from "monaco-editor";
import type { IDisposable } from "@core/types";
import type { LspClient, LspProviderRegistration } from "./types";
import { LSP_METHODS } from "./protocol";
import {
  fromMonacoPosition,
  fromMonacoRange,
  fromMonacoColor,
  toMonacoCompletionItem,
  toMonacoHover,
  toMonacoSignatureHelp,
  toMonacoDefinition,
  toMonacoDocumentSymbols,
  toMonacoCodeActions,
  toMonacoCodeLens,
  toMonacoCommand,
  toMonacoDocumentLink,
  toMonacoColorInformation,
  toMonacoColorPresentation,
  toMonacoTextEdits,
  toMonacoFoldingRanges,
  flattenSelectionRange,
  toMonacoLinkedEditingRanges,
  toMonacoInlayHint,
  toMonacoSemanticTokens,
  getSemanticTokensLegend,
  toMonacoDocumentHighlights,
} from "./converters";

function has(caps: Record<string, unknown>, key: string): boolean {
  return caps[key] !== undefined && caps[key] !== null && caps[key] !== false;
}

function buildDocParams(model: monacoNs.editor.ITextModel, position: monacoNs.Position) {
  return {
    textDocument: { uri: model.uri.toString() },
    position: fromMonacoPosition(position),
  };
}

/**
 * Register all 24 LSP Monaco providers, guarded by server capabilities.
 */
export function registerLSPProviders(
  monaco: typeof monacoNs,
  languageId: string,
  client: LspClient,
  serverCaps: Record<string, unknown>,
): LspProviderRegistration {
  const disposables: IDisposable[] = [];

  // ── 1. CompletionItemProvider ────────────────────────────
  if (has(serverCaps, "completionProvider")) {
    const triggerChars = (
      (serverCaps["completionProvider"] as { triggerCharacters?: string[] })
        ?.triggerCharacters ?? [".", "/", "@", "<", '"', "'", "`", " "]
    );

    disposables.push(
      monaco.languages.registerCompletionItemProvider(languageId, {
        triggerCharacters: triggerChars,
        async provideCompletionItems(model, position) {
          const result = await client.request<{
            items?: unknown[];
            isIncomplete?: boolean;
          } | unknown[]>(LSP_METHODS.completion, buildDocParams(model, position));

          const items = Array.isArray(result) ? result : (result?.items ?? []);
          const word = model.getWordUntilPosition(position);
          const defaultRange: monacoNs.IRange = {
            startLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endLineNumber: position.lineNumber,
            endColumn: word.endColumn,
          };

          return {
            suggestions: items.map((item) =>
              toMonacoCompletionItem(monaco, item as Parameters<typeof toMonacoCompletionItem>[1], defaultRange),
            ),
            incomplete: !Array.isArray(result) && result?.isIncomplete === true,
          };
        },
        async resolveCompletionItem(item) {
          try {
            const resolved = await client.request<Record<string, unknown>>(
              LSP_METHODS.completionResolve,
              item,
            );
            if (resolved.detail) item.detail = resolved.detail as string;
            if (resolved.documentation) {
              item.documentation = typeof resolved.documentation === "string"
                ? resolved.documentation
                : { value: (resolved.documentation as { value: string }).value };
            }
          } catch { /* resolve is best-effort */ }
          return item;
        },
      }),
    );
  }

  // ── 2. HoverProvider ─────────────────────────────────────
  if (has(serverCaps, "hoverProvider")) {
    disposables.push(
      monaco.languages.registerHoverProvider(languageId, {
        async provideHover(model, position) {
          const result = await client.request<Parameters<typeof toMonacoHover>[0] | null>(
            LSP_METHODS.hover,
            buildDocParams(model, position),
          );
          return result ? toMonacoHover(result) : null;
        },
      }),
    );
  }

  // ── 3. SignatureHelpProvider ──────────────────────────────
  if (has(serverCaps, "signatureHelpProvider")) {
    disposables.push(
      monaco.languages.registerSignatureHelpProvider(languageId, {
        signatureHelpTriggerCharacters: ["(", ","],
        signatureHelpRetriggerCharacters: [","],
        async provideSignatureHelp(model, position) {
          const result = await client.request<Parameters<typeof toMonacoSignatureHelp>[0] | null>(
            LSP_METHODS.signatureHelp,
            buildDocParams(model, position),
          );
          return result ? toMonacoSignatureHelp(result) : null;
        },
      }),
    );
  }

  // ── 4. DefinitionProvider ────────────────────────────────
  if (has(serverCaps, "definitionProvider")) {
    disposables.push(
      monaco.languages.registerDefinitionProvider(languageId, {
        async provideDefinition(model, position) {
          const result = await client.request(
            LSP_METHODS.definition,
            buildDocParams(model, position),
          );
          return toMonacoDefinition(result as Parameters<typeof toMonacoDefinition>[0]);
        },
      }),
    );
  }

  // ── 5. DeclarationProvider ───────────────────────────────
  if (has(serverCaps, "declarationProvider")) {
    disposables.push(
      monaco.languages.registerDeclarationProvider(languageId, {
        async provideDeclaration(model, position) {
          const result = await client.request(
            LSP_METHODS.declaration,
            buildDocParams(model, position),
          );
          return toMonacoDefinition(result as Parameters<typeof toMonacoDefinition>[0]);
        },
      }),
    );
  }

  // ── 6. TypeDefinitionProvider ────────────────────────────
  if (has(serverCaps, "typeDefinitionProvider")) {
    disposables.push(
      monaco.languages.registerTypeDefinitionProvider(languageId, {
        async provideTypeDefinition(model, position) {
          const result = await client.request(
            LSP_METHODS.typeDefinition,
            buildDocParams(model, position),
          );
          return toMonacoDefinition(result as Parameters<typeof toMonacoDefinition>[0]);
        },
      }),
    );
  }

  // ── 7. ImplementationProvider ────────────────────────────
  if (has(serverCaps, "implementationProvider")) {
    disposables.push(
      monaco.languages.registerImplementationProvider(languageId, {
        async provideImplementation(model, position) {
          const result = await client.request(
            LSP_METHODS.implementation,
            buildDocParams(model, position),
          );
          return toMonacoDefinition(result as Parameters<typeof toMonacoDefinition>[0]);
        },
      }),
    );
  }

  // ── 8. ReferenceProvider ─────────────────────────────────
  if (has(serverCaps, "referencesProvider")) {
    disposables.push(
      monaco.languages.registerReferenceProvider(languageId, {
        async provideReferences(model, position, context) {
          const result = await client.request<Array<{ uri: string; range: unknown }> | null>(
            LSP_METHODS.references,
            { ...buildDocParams(model, position), context },
          );
          if (!result) return [];
          return toMonacoDefinition(result as Parameters<typeof toMonacoDefinition>[0]) as monacoNs.languages.Location[];
        },
      }),
    );
  }

  // ── 9. DocumentHighlightProvider ─────────────────────────
  if (has(serverCaps, "documentHighlightProvider")) {
    disposables.push(
      monaco.languages.registerDocumentHighlightProvider(languageId, {
        async provideDocumentHighlights(model, position) {
          const result = await client.request<Parameters<typeof toMonacoDocumentHighlights>[0] | null>(
            LSP_METHODS.documentHighlight,
            buildDocParams(model, position),
          );
          return result ? toMonacoDocumentHighlights(result) : [];
        },
      }),
    );
  }

  // ── 10. DocumentSymbolProvider ───────────────────────────
  if (has(serverCaps, "documentSymbolProvider")) {
    disposables.push(
      monaco.languages.registerDocumentSymbolProvider(languageId, {
        async provideDocumentSymbols(model) {
          const result = await client.request<unknown[] | null>(
            LSP_METHODS.documentSymbol,
            { textDocument: { uri: model.uri.toString() } },
          );
          if (!result || result.length === 0) return [];
          return toMonacoDocumentSymbols(
            monaco,
            result as Parameters<typeof toMonacoDocumentSymbols>[1],
          );
        },
      }),
    );
  }

  // ── 11. CodeActionProvider ───────────────────────────────
  if (has(serverCaps, "codeActionProvider")) {
    disposables.push(
      monaco.languages.registerCodeActionProvider(languageId, {
        async provideCodeActions(model, range, context) {
          const result = await client.request<unknown[] | null>(
            LSP_METHODS.codeAction,
            {
              textDocument: { uri: model.uri.toString() },
              range: fromMonacoRange(range),
              context: {
                diagnostics: context.markers.map((m) => ({
                  range: fromMonacoRange(m),
                  severity: m.severity,
                  message: m.message,
                  source: m.source,
                  code: m.code,
                })),
                only: context.only,
              },
            },
          );
          if (!result) return { actions: [], dispose: () => {} };
          return toMonacoCodeActions(monaco, result as Parameters<typeof toMonacoCodeActions>[1]);
        },
      }),
    );
  }

  // ── 12. CodeLensProvider ─────────────────────────────────
  if (has(serverCaps, "codeLensProvider")) {
    disposables.push(
      monaco.languages.registerCodeLensProvider(languageId, {
        async provideCodeLenses(model) {
          const result = await client.request<unknown[] | null>(
            LSP_METHODS.codeLens,
            { textDocument: { uri: model.uri.toString() } },
          );
          if (!result) return { lenses: [], dispose: () => {} };
          return {
            lenses: (result as Parameters<typeof toMonacoCodeLens>[0][]).map(toMonacoCodeLens),
            dispose: () => {},
          };
        },
        async resolveCodeLens(_model, codeLens) {
          try {
            const resolved = await client.request<{ command?: Parameters<typeof toMonacoCommand>[0] }>(
              LSP_METHODS.codeLensResolve,
              codeLens,
            );
            if (resolved.command) {
              codeLens.command = toMonacoCommand(resolved.command);
            }
          } catch { /* resolve is best-effort */ }
          return codeLens;
        },
      }),
    );
  }

  // ── 13. DocumentLinkProvider ──────────────────────────────
  if (has(serverCaps, "documentLinkProvider")) {
    disposables.push(
      monaco.languages.registerLinkProvider(languageId, {
        async provideLinks(model) {
          const result = await client.request<unknown[] | null>(
            LSP_METHODS.documentLink,
            { textDocument: { uri: model.uri.toString() } },
          );
          if (!result) return { links: [] };
          return {
            links: (result as Parameters<typeof toMonacoDocumentLink>[0][]).map(toMonacoDocumentLink),
          };
        },
        async resolveLink(link) {
          try {
            const resolved = await client.request<{ target?: string }>(
              LSP_METHODS.documentLinkResolve,
              link,
            );
            if (resolved.target) link.url = resolved.target;
          } catch { /* best-effort */ }
          return link;
        },
      }),
    );
  }

  // ── 14. ColorProvider ────────────────────────────────────
  if (has(serverCaps, "colorProvider")) {
    disposables.push(
      monaco.languages.registerColorProvider(languageId, {
        async provideDocumentColors(model) {
          const result = await client.request<unknown[] | null>(
            LSP_METHODS.documentColor,
            { textDocument: { uri: model.uri.toString() } },
          );
          if (!result) return [];
          return (result as Parameters<typeof toMonacoColorInformation>[0][]).map(toMonacoColorInformation);
        },
        async provideColorPresentations(model, colorInfo) {
          const result = await client.request<unknown[] | null>(
            LSP_METHODS.colorPresentation,
            {
              textDocument: { uri: model.uri.toString() },
              color: fromMonacoColor(colorInfo.color),
              range: fromMonacoRange(colorInfo.range),
            },
          );
          if (!result) return [];
          return (result as Parameters<typeof toMonacoColorPresentation>[0][]).map(toMonacoColorPresentation);
        },
      }),
    );
  }

  // ── 15. DocumentFormattingEditProvider ────────────────────
  if (has(serverCaps, "documentFormattingProvider")) {
    disposables.push(
      monaco.languages.registerDocumentFormattingEditProvider(languageId, {
        async provideDocumentFormattingEdits(model, options) {
          const result = await client.request<unknown[] | null>(
            LSP_METHODS.formatting,
            {
              textDocument: { uri: model.uri.toString() },
              options: {
                tabSize: options.tabSize,
                insertSpaces: options.insertSpaces,
              },
            },
          );
          return result ? toMonacoTextEdits(result as Parameters<typeof toMonacoTextEdits>[0]) : [];
        },
      }),
    );
  }

  // ── 16. DocumentRangeFormattingEditProvider ───────────────
  if (has(serverCaps, "documentRangeFormattingProvider")) {
    disposables.push(
      monaco.languages.registerDocumentRangeFormattingEditProvider(languageId, {
        async provideDocumentRangeFormattingEdits(model, range, options) {
          const result = await client.request<unknown[] | null>(
            LSP_METHODS.rangeFormatting,
            {
              textDocument: { uri: model.uri.toString() },
              range: fromMonacoRange(range),
              options: {
                tabSize: options.tabSize,
                insertSpaces: options.insertSpaces,
              },
            },
          );
          return result ? toMonacoTextEdits(result as Parameters<typeof toMonacoTextEdits>[0]) : [];
        },
      }),
    );
  }

  // ── 17. OnTypeFormattingEditProvider ──────────────────────
  if (has(serverCaps, "documentOnTypeFormattingProvider")) {
    const onTypeProvider = serverCaps["documentOnTypeFormattingProvider"] as
      | { firstTriggerCharacter?: string; moreTriggerCharacter?: string[] }
      | undefined;

    disposables.push(
      monaco.languages.registerOnTypeFormattingEditProvider(languageId, {
        autoFormatTriggerCharacters: [
          onTypeProvider?.firstTriggerCharacter ?? ";",
          ...(onTypeProvider?.moreTriggerCharacter ?? ["}", "\n"]),
        ],
        async provideOnTypeFormattingEdits(model, position, ch, options) {
          const result = await client.request<unknown[] | null>(
            LSP_METHODS.onTypeFormatting,
            {
              textDocument: { uri: model.uri.toString() },
              position: fromMonacoPosition(position),
              ch,
              options: {
                tabSize: options.tabSize,
                insertSpaces: options.insertSpaces,
              },
            },
          );
          return result ? toMonacoTextEdits(result as Parameters<typeof toMonacoTextEdits>[0]) : [];
        },
      }),
    );
  }

  // ── 18. RenameProvider ───────────────────────────────────
  if (has(serverCaps, "renameProvider")) {
    disposables.push(
      monaco.languages.registerRenameProvider(languageId, {
        async provideRenameEdits(model, position, newName) {
          const result = await client.request<{
            changes?: Record<string, Array<{ range: unknown; newText: string }>>;
            documentChanges?: unknown[];
          } | null>(LSP_METHODS.rename, {
            ...buildDocParams(model, position),
            newName,
          });
          if (!result) return { edits: [] };

          const edits: monacoNs.languages.IWorkspaceTextEdit[] = [];
          if (result.changes) {
            for (const [uri, textEdits] of Object.entries(result.changes)) {
              for (const te of textEdits) {
                edits.push({
                  resource: monaco.Uri.parse(uri),
                  textEdit: { range: toMonacoTextEdits([te as { range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }])[0].range, text: te.newText },
                  versionId: undefined,
                });
              }
            }
          }
          return { edits };
        },
        async resolveRenameLocation(model, position) {
          try {
            const result = await client.request<{
              range: Parameters<typeof fromMonacoRange>[0];
              placeholder: string;
            } | null>(LSP_METHODS.prepareRename, buildDocParams(model, position));

            if (!result) return { text: "", range: { startLineNumber: 0, startColumn: 0, endLineNumber: 0, endColumn: 0 }, rejectReason: "Rename not available" };

            // Handle different prepare rename response formats
            if ("range" in result && "placeholder" in result) {
              return {
                text: result.placeholder,
                range: {
                  startLineNumber: (result.range as unknown as monacoNs.IRange).startLineNumber,
                  startColumn: (result.range as unknown as monacoNs.IRange).startColumn,
                  endLineNumber: (result.range as unknown as monacoNs.IRange).endLineNumber,
                  endColumn: (result.range as unknown as monacoNs.IRange).endColumn,
                },
              };
            }
          } catch { /* Fall through to word-at-position */ }

          const word = model.getWordAtPosition(position);
          if (!word) return { text: "", range: { startLineNumber: 0, startColumn: 0, endLineNumber: 0, endColumn: 0 }, rejectReason: "No symbol at position" };
          return {
            text: word.word,
            range: {
              startLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endLineNumber: position.lineNumber,
              endColumn: word.endColumn,
            },
          };
        },
      }),
    );
  }

  // ── 19. FoldingRangeProvider ──────────────────────────────
  if (has(serverCaps, "foldingRangeProvider")) {
    disposables.push(
      monaco.languages.registerFoldingRangeProvider(languageId, {
        async provideFoldingRanges(model) {
          const result = await client.request<unknown[] | null>(
            LSP_METHODS.foldingRange,
            { textDocument: { uri: model.uri.toString() } },
          );
          if (!result) return [];
          return toMonacoFoldingRanges(monaco, result as Parameters<typeof toMonacoFoldingRanges>[1]);
        },
      }),
    );
  }

  // ── 20. SelectionRangeProvider ───────────────────────────
  if (has(serverCaps, "selectionRangeProvider")) {
    disposables.push(
      monaco.languages.registerSelectionRangeProvider(languageId, {
        async provideSelectionRanges(model, positions) {
          const result = await client.request<unknown[] | null>(
            LSP_METHODS.selectionRange,
            {
              textDocument: { uri: model.uri.toString() },
              positions: positions.map(fromMonacoPosition),
            },
          );
          if (!result) return [];
          return (result as Parameters<typeof flattenSelectionRange>[0][]).map(flattenSelectionRange);
        },
      }),
    );
  }

  // ── 21. LinkedEditingRangeProvider ───────────────────────
  if (has(serverCaps, "linkedEditingRangeProvider")) {
    disposables.push(
      monaco.languages.registerLinkedEditingRangeProvider(languageId, {
        async provideLinkedEditingRanges(model, position) {
          const result = await client.request<Parameters<typeof toMonacoLinkedEditingRanges>[0] | null>(
            LSP_METHODS.linkedEditingRange,
            buildDocParams(model, position),
          );
          return result ? toMonacoLinkedEditingRanges(result) : null;
        },
      }),
    );
  }

  // ── 22. InlayHintsProvider ───────────────────────────────
  if (has(serverCaps, "inlayHintProvider")) {
    disposables.push(
      monaco.languages.registerInlayHintsProvider(languageId, {
        async provideInlayHints(model, range) {
          const result = await client.request<unknown[] | null>(
            LSP_METHODS.inlayHint,
            {
              textDocument: { uri: model.uri.toString() },
              range: fromMonacoRange(range),
            },
          );
          if (!result) return { hints: [], dispose: () => {} };
          return {
            hints: (result as Parameters<typeof toMonacoInlayHint>[1][]).map(
              (h) => toMonacoInlayHint(monaco, h),
            ),
            dispose: () => {},
          };
        },
        async resolveInlayHint(hint) {
          try {
            const resolved = await client.request<Record<string, unknown>>(
              LSP_METHODS.inlayHintResolve,
              hint,
            );
            if (resolved.tooltip) {
              hint.tooltip = typeof resolved.tooltip === "string"
                ? resolved.tooltip
                : { value: (resolved.tooltip as { value: string }).value };
            }
          } catch { /* best-effort */ }
          return hint;
        },
      }),
    );
  }

  // ── 23. DocumentSemanticTokensProvider ────────────────────
  const legend = getSemanticTokensLegend(serverCaps);
  if (has(serverCaps, "semanticTokensProvider") && legend) {
    disposables.push(
      monaco.languages.registerDocumentSemanticTokensProvider(languageId, {
        getLegend: () => legend,
        async provideDocumentSemanticTokens(model) {
          const result = await client.request<Parameters<typeof toMonacoSemanticTokens>[0] | null>(
            LSP_METHODS.semanticTokensFull,
            { textDocument: { uri: model.uri.toString() } },
          );
          return result ? toMonacoSemanticTokens(result) : null;
        },
        releaseDocumentSemanticTokens() {},
      }),
    );

    // ── 24. DocumentRangeSemanticTokensProvider ──────────────
    disposables.push(
      monaco.languages.registerDocumentRangeSemanticTokensProvider(languageId, {
        getLegend: () => legend,
        async provideDocumentRangeSemanticTokens(model, range) {
          const result = await client.request<Parameters<typeof toMonacoSemanticTokens>[0] | null>(
            LSP_METHODS.semanticTokensRange,
            {
              textDocument: { uri: model.uri.toString() },
              range: fromMonacoRange(range),
            },
          );
          return result ? toMonacoSemanticTokens(result) : null;
        },
      }),
    );
  }

  return {
    disposables,
    dispose() {
      for (const d of disposables) d.dispose();
      disposables.length = 0;
    },
  };
}
