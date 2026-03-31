// ── Provider registry — converts CDN JSON data into Monaco providers ──
import type * as monacoNs from "monaco-editor";
import type { ProviderType, ProviderRegistrar } from "./types";

/**
 * Map of provider type → registration function.
 * Each function takes raw JSON data from the CDN, converts it to a Monaco
 * provider, and registers it.  Returns IDisposable(s) for cleanup.
 */
function buildRegistrarMap(
  monaco: typeof monacoNs,
): Record<ProviderType, ProviderRegistrar> {
  const reg = monaco.languages;

  return {
    completion: (_m, lang, data) => {
      const items = normalizeArray(data, "items", "completions");
      if (!items.length) return null;
      return reg.registerCompletionItemProvider(lang, {
        provideCompletionItems(model, position) {
          const word = model.getWordAtPosition(position);
          const range = word
            ? {
                startLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endLineNumber: position.lineNumber,
                endColumn: word.endColumn,
              }
            : {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              };
          return {
            suggestions: items.map((item: Record<string, unknown>) => ({
              label: String(item.label ?? item.name ?? ""),
              kind: toCompletionKind(item.kind, monaco),
              insertText: String(item.insertText ?? item.label ?? item.name ?? ""),
              range,
              detail: item.detail ? String(item.detail) : undefined,
              documentation: item.documentation
                ? { value: String(item.documentation) }
                : undefined,
              sortText: item.sortText ? String(item.sortText) : undefined,
            })),
          };
        },
      });
    },

    hover: (_m, lang, data) => {
      const entries = normalizeArray(data, "entries", "items", "hovers");
      if (!entries.length) return null;
      return reg.registerHoverProvider(lang, {
        provideHover(_model, position) {
          const word = _model.getWordAtPosition(position);
          if (!word) return null;
          const match = entries.find(
            (e: Record<string, unknown>) =>
              String(e.name ?? e.label ?? "") === word.word,
          );
          if (!match) return null;
          return {
            contents: [
              { value: "```" + lang + "\n" + String(match.signature ?? match.name ?? word.word) + "\n```" },
              match.documentation ? { value: String(match.documentation) } : { value: "" },
            ].filter((c) => c.value),
          };
        },
      });
    },

    definition: (_m, lang, data) => {
      const entries = normalizeArray(data, "entries", "definitions");
      if (!entries.length) return null;
      return reg.registerDefinitionProvider(lang, {
        provideDefinition(_model, position) {
          const word = _model.getWordAtPosition(position);
          if (!word) return null;
          const match = entries.find(
            (e: Record<string, unknown>) => String(e.name ?? "") === word.word,
          );
          if (!match || !match.uri) return null;
          return {
            uri: monaco.Uri.parse(String(match.uri)),
            range: toRange(match.range),
          };
        },
      });
    },

    declaration: (_m, lang, data) => {
      const entries = normalizeArray(data, "entries", "declarations");
      if (!entries.length) return null;
      return reg.registerDeclarationProvider(lang, {
        provideDeclaration(_model, position) {
          const word = _model.getWordAtPosition(position);
          if (!word) return null;
          const match = entries.find(
            (e: Record<string, unknown>) => String(e.name ?? "") === word.word,
          );
          if (!match || !match.uri) return null;
          return {
            uri: monaco.Uri.parse(String(match.uri)),
            range: toRange(match.range),
          };
        },
      });
    },

    typeDefinition: (_m, lang, data) => {
      const entries = normalizeArray(data, "entries", "typeDefinitions");
      if (!entries.length) return null;
      return reg.registerTypeDefinitionProvider(lang, {
        provideTypeDefinition(_model, position) {
          const word = _model.getWordAtPosition(position);
          if (!word) return null;
          const match = entries.find(
            (e: Record<string, unknown>) => String(e.name ?? "") === word.word,
          );
          if (!match || !match.uri) return null;
          return {
            uri: monaco.Uri.parse(String(match.uri)),
            range: toRange(match.range),
          };
        },
      });
    },

    implementation: (_m, lang, data) => {
      const entries = normalizeArray(data, "entries", "implementations");
      if (!entries.length) return null;
      return reg.registerImplementationProvider(lang, {
        provideImplementation(_model, position) {
          const word = _model.getWordAtPosition(position);
          if (!word) return null;
          const match = entries.find(
            (e: Record<string, unknown>) => String(e.name ?? "") === word.word,
          );
          if (!match || !match.uri) return null;
          return {
            uri: monaco.Uri.parse(String(match.uri)),
            range: toRange(match.range),
          };
        },
      });
    },

    references: (_m, lang, data) => {
      const entries = normalizeArray(data, "entries", "references");
      if (!entries.length) return null;
      return reg.registerReferenceProvider(lang, {
        provideReferences(_model, position) {
          const word = _model.getWordAtPosition(position);
          if (!word) return [];
          return entries
            .filter((e: Record<string, unknown>) => String(e.name ?? "") === word.word)
            .map((e: Record<string, unknown>) => ({
              uri: monaco.Uri.parse(String(e.uri ?? "")),
              range: toRange(e.range),
            }));
        },
      });
    },

    documentHighlight: (_m, lang, data) => {
      const entries = normalizeArray(data, "entries", "highlights");
      if (!entries.length) return null;
      return reg.registerDocumentHighlightProvider(lang, {
        provideDocumentHighlights(_model, position) {
          const word = _model.getWordAtPosition(position);
          if (!word) return [];
          return entries
            .filter((e: Record<string, unknown>) => String(e.name ?? "") === word.word)
            .map((e: Record<string, unknown>) => ({
              range: toRange(e.range),
              kind: (e.kind as number) ?? 0,
            }));
        },
      });
    },

    documentSymbol: (_m, lang, data) => {
      const entries = normalizeArray(data, "entries", "symbols");
      if (!entries.length) return null;
      return reg.registerDocumentSymbolProvider(lang, {
        provideDocumentSymbols() {
          return entries.map((e: Record<string, unknown>) => ({
            name: String(e.name ?? ""),
            detail: String(e.detail ?? ""),
            kind: (e.kind as number) ?? 0,
            range: toRange(e.range),
            selectionRange: toRange(e.selectionRange ?? e.range),
            tags: [],
          }));
        },
      });
    },

    codeActions: (_m, lang, data) => {
      const actions = normalizeArray(data, "actions", "codeActions", "items");
      if (!actions.length) return null;
      return reg.registerCodeActionProvider(lang, {
        provideCodeActions() {
          return {
            actions: actions.map((a: Record<string, unknown>) => ({
              title: String(a.title ?? ""),
              kind: String(a.kind ?? ""),
              diagnostics: [],
            })),
            dispose() {},
          };
        },
      });
    },

    links: (_m, lang, data) => {
      const links = normalizeArray(data, "links", "items");
      if (!links.length) return null;
      return reg.registerLinkProvider(lang, {
        provideLinks() {
          return {
            links: links.map((l: Record<string, unknown>) => ({
              range: toRange(l.range),
              url: String(l.url ?? l.uri ?? ""),
            })),
          };
        },
      });
    },

    signatureHelp: (_m, lang, data) => {
      const signatures = normalizeArray(data, "signatures", "items");
      if (!signatures.length) return null;
      return reg.registerSignatureHelpProvider(lang, {
        signatureHelpTriggerCharacters: ["(", ","],
        provideSignatureHelp() {
          return {
            value: {
              signatures: signatures.map((s: Record<string, unknown>) => ({
                label: String(s.label ?? ""),
                documentation: s.documentation ? { value: String(s.documentation) } : undefined,
                parameters: normalizeArray(s, "parameters").map(
                  (p: Record<string, unknown>) => ({
                    label: String(p.label ?? ""),
                    documentation: p.documentation ? { value: String(p.documentation) } : undefined,
                  }),
                ),
              })),
              activeSignature: 0,
              activeParameter: 0,
            },
            dispose() {},
          };
        },
      });
    },

    foldingRange: (_m, lang, data) => {
      const ranges = normalizeArray(data, "ranges", "foldingRanges", "items");
      if (!ranges.length) return null;
      return reg.registerFoldingRangeProvider(lang, {
        provideFoldingRanges() {
          return ranges.map((r: Record<string, unknown>) => ({
            start: Number(r.start ?? r.startLine ?? 0),
            end: Number(r.end ?? r.endLine ?? 0),
            kind: r.kind as monacoNs.languages.FoldingRangeKind | undefined,
          }));
        },
      });
    },

    inlayHints: (_m, lang, data) => {
      const hints = normalizeArray(data, "hints", "inlayHints", "items");
      if (!hints.length) return null;
      return reg.registerInlayHintsProvider(lang, {
        provideInlayHints() {
          return {
            hints: hints.map((h: Record<string, unknown>) => ({
              position: {
                lineNumber: Number((h.position as Record<string, unknown>)?.lineNumber ?? 0),
                column: Number((h.position as Record<string, unknown>)?.column ?? 0),
              },
              label: String(h.label ?? ""),
              kind: (h.kind as number) ?? 0,
            })),
            dispose() {},
          };
        },
      });
    },

    codeLens: (_m, lang, data) => {
      const lenses = normalizeArray(data, "lenses", "codeLenses", "items");
      if (!lenses.length) return null;
      return reg.registerCodeLensProvider(lang, {
        provideCodeLenses() {
          return {
            lenses: lenses.map((l: Record<string, unknown>) => ({
              range: toRange(l.range),
              command: l.command
                ? {
                    id: String((l.command as Record<string, unknown>).id ?? ""),
                    title: String((l.command as Record<string, unknown>).title ?? ""),
                  }
                : undefined,
            })),
            dispose() {},
          };
        },
      });
    },

    color: (_m, lang, data) => {
      const colors = normalizeArray(data, "colors", "items");
      if (!colors.length) return null;
      return reg.registerColorProvider(lang, {
        provideDocumentColors() {
          return colors.map((c: Record<string, unknown>) => ({
            range: toRange(c.range),
            color: (c.color ?? { red: 0, green: 0, blue: 0, alpha: 1 }) as monacoNs.languages.IColor,
          }));
        },
        provideColorPresentations() {
          return [];
        },
      });
    },

    rename: (_m, lang, data) => {
      const entries = normalizeArray(data, "entries", "renames");
      if (!entries.length) return null;
      return reg.registerRenameProvider(lang, {
        provideRenameEdits() {
          return { edits: [] };
        },
        resolveRenameLocation(_model, position) {
          const word = _model.getWordAtPosition(position);
          if (!word) return null;
          return {
            range: {
              startLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endLineNumber: position.lineNumber,
              endColumn: word.endColumn,
            },
            text: word.word,
          };
        },
      });
    },

    selectionRange: (_m, lang, data) => {
      const ranges = normalizeArray(data, "ranges", "selectionRanges");
      if (!ranges.length) return null;
      return reg.registerSelectionRangeProvider(lang, {
        provideSelectionRanges() {
          return [ranges.map((r: Record<string, unknown>) => ({ range: toRange(r.range ?? r) }))];
        },
      });
    },

    linkedEditingRange: (_m, lang, data) => {
      const entries = normalizeArray(data, "entries", "ranges");
      if (!entries.length) return null;
      return reg.registerLinkedEditingRangeProvider(lang, {
        provideLinkedEditingRanges() {
          return {
            ranges: entries.map((e: Record<string, unknown>) => toRange(e.range ?? e)),
            wordPattern: undefined,
          };
        },
      });
    },

    formatting: (_m, lang, data) => {
      const edits = normalizeArray(data, "edits", "items");
      if (!edits.length) return null;
      return reg.registerDocumentFormattingEditProvider(lang, {
        provideDocumentFormattingEdits() {
          return edits.map((e: Record<string, unknown>) => ({
            range: toRange(e.range),
            text: String(e.text ?? e.newText ?? ""),
          }));
        },
      });
    },

    documentRangeFormatting: (_m, lang, data) => {
      const edits = normalizeArray(data, "edits", "items");
      if (!edits.length) return null;
      return reg.registerDocumentRangeFormattingEditProvider(lang, {
        provideDocumentRangeFormattingEdits() {
          return edits.map((e: Record<string, unknown>) => ({
            range: toRange(e.range),
            text: String(e.text ?? e.newText ?? ""),
          }));
        },
      });
    },

    onTypeFormatting: (_m, lang, data) => {
      const raw = data as Record<string, unknown> | null;
      if (!raw) return null;
      const triggerChars = normalizeArray(raw, "triggerCharacters");
      const first = triggerChars[0] ? String(triggerChars[0]) : ";";
      const rest = triggerChars.slice(1).map(String);
      return reg.registerOnTypeFormattingEditProvider(lang, {
        autoFormatTriggerCharacters: [first, ...rest],
        provideOnTypeFormattingEdits() {
          return [];
        },
      });
    },

    semanticTokens: (_m, lang, data) => {
      const raw = data as Record<string, unknown> | null;
      if (!raw) return null;
      const legend = (raw.legend ?? { tokenTypes: [], tokenModifiers: [] }) as {
        tokenTypes: string[];
        tokenModifiers: string[];
      };
      return reg.registerDocumentSemanticTokensProvider(lang, {
        getLegend() {
          return legend;
        },
        provideDocumentSemanticTokens() {
          return { data: new Uint32Array(0) };
        },
        releaseDocumentSemanticTokens() {},
      });
    },

    rangeSemanticTokens: (_m, lang, data) => {
      const raw = data as Record<string, unknown> | null;
      if (!raw) return null;
      const legend = (raw.legend ?? { tokenTypes: [], tokenModifiers: [] }) as {
        tokenTypes: string[];
        tokenModifiers: string[];
      };
      return reg.registerDocumentRangeSemanticTokensProvider(lang, {
        getLegend() {
          return legend;
        },
        provideDocumentRangeSemanticTokens() {
          return { data: new Uint32Array(0) };
        },
      });
    },

    inlineCompletions: (_m, lang, data) => {
      const items = normalizeArray(data, "items", "completions");
      if (!items.length) return null;
      return reg.registerInlineCompletionsProvider(lang, {
        provideInlineCompletions() {
          return {
            items: items.map((item: Record<string, unknown>) => ({
              insertText: String(item.insertText ?? item.text ?? ""),
            })),
          };
        },
        disposeInlineCompletions() {},
      });
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────

/** Safely extract array from various possible JSON field names */
function normalizeArray(
  data: unknown,
  ...keys: string[]
): Array<Record<string, unknown>> {
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;

  // If data itself is an array, return it
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    const val = obj[key];
    if (Array.isArray(val)) return val;
  }
  return [];
}

function toRange(r: unknown): monacoNs.IRange {
  if (!r || typeof r !== "object") {
    return { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 };
  }
  const obj = r as Record<string, unknown>;
  return {
    startLineNumber: Number(obj.startLineNumber ?? obj.startLine ?? 1),
    startColumn: Number(obj.startColumn ?? 1),
    endLineNumber: Number(obj.endLineNumber ?? obj.endLine ?? 1),
    endColumn: Number(obj.endColumn ?? 1),
  };
}

function toCompletionKind(
  kind: unknown,
  monaco: typeof monacoNs,
): monacoNs.languages.CompletionItemKind {
  if (typeof kind === "number") return kind;
  // Map string kind to Monaco enum
  const map: Record<string, monacoNs.languages.CompletionItemKind> = {
    method: monaco.languages.CompletionItemKind.Method,
    function: monaco.languages.CompletionItemKind.Function,
    constructor: monaco.languages.CompletionItemKind.Constructor,
    field: monaco.languages.CompletionItemKind.Field,
    variable: monaco.languages.CompletionItemKind.Variable,
    class: monaco.languages.CompletionItemKind.Class,
    struct: monaco.languages.CompletionItemKind.Struct,
    interface: monaco.languages.CompletionItemKind.Interface,
    module: monaco.languages.CompletionItemKind.Module,
    property: monaco.languages.CompletionItemKind.Property,
    event: monaco.languages.CompletionItemKind.Event,
    operator: monaco.languages.CompletionItemKind.Operator,
    unit: monaco.languages.CompletionItemKind.Unit,
    value: monaco.languages.CompletionItemKind.Value,
    constant: monaco.languages.CompletionItemKind.Constant,
    enum: monaco.languages.CompletionItemKind.Enum,
    enumMember: monaco.languages.CompletionItemKind.EnumMember,
    keyword: monaco.languages.CompletionItemKind.Keyword,
    snippet: monaco.languages.CompletionItemKind.Snippet,
    text: monaco.languages.CompletionItemKind.Text,
    color: monaco.languages.CompletionItemKind.Color,
    file: monaco.languages.CompletionItemKind.File,
    reference: monaco.languages.CompletionItemKind.Reference,
    folder: monaco.languages.CompletionItemKind.Folder,
    typeParameter: monaco.languages.CompletionItemKind.TypeParameter,
  };
  return map[String(kind).toLowerCase()] ?? monaco.languages.CompletionItemKind.Text;
}

export { buildRegistrarMap };