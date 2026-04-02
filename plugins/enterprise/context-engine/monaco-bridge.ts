// ── Monaco Provider Bridge ─────────────────────────────────
// Registers Monaco language providers from CDN data stored in the
// Context Engine provider registry.  Called after a lazy CDN fetch
// succeeds, so the editor gets completions / hover / tokenization
// even when the LSP server is down.
//
// Covers all 29 ContextProviderName types from the manifest interface.

import type { ContextEngineAPI } from "./api";
import { convertGrammar } from "./converters";

/** Track which providers have already been registered per language */
const registered = new Map<string, Set<string>>();

function markRegistered(language: string, provider: string): boolean {
  let set = registered.get(language);
  if (!set) { set = new Set(); registered.set(language, set); }
  if (set.has(provider)) return false;
  set.add(provider);
  return true;
}

/**
 * Register Monaco providers for a given language from stored CDN data.
 *
 * @param monaco  The `monaco` namespace
 * @param languageId  e.g. "typescript", "python"
 * @param engine  ContextEngineAPI with populated provider data
 */
export function registerMonacoProviders(
  monaco: typeof import("monaco-editor"),
  languageId: string,
  engine: ContextEngineAPI,
): void {
  const providers = engine.getAllProviders(languageId);
  if (!providers || providers.size === 0) return;

  // ── 1. Monarch tokenizer ──────────────────────────────
  registerMonarch(monaco, languageId, providers);

  // ── 2. Completion ─────────────────────────────────────
  registerCompletion(monaco, languageId, providers);

  // ── 3. Hover ──────────────────────────────────────────
  registerHover(monaco, languageId, providers);

  // ── 4. Signature help ─────────────────────────────────
  registerSignatureHelp(monaco, languageId, providers);

  // ── 5. Code actions ───────────────────────────────────
  registerCodeActions(monaco, languageId, providers);

  // ── 6. Code lens ──────────────────────────────────────
  registerCodeLens(monaco, languageId, providers);

  // ── 7. Color provider ─────────────────────────────────
  registerColor(monaco, languageId, providers);

  // ── 8. Definition ─────────────────────────────────────
  registerLocationProvider(monaco, languageId, providers, "definition", "registerDefinitionProvider");

  // ── 9. Declaration ────────────────────────────────────
  registerLocationProvider(monaco, languageId, providers, "declaration", "registerDeclarationProvider");

  // ── 10. Implementation ────────────────────────────────
  registerLocationProvider(monaco, languageId, providers, "implementation", "registerImplementationProvider");

  // ── 11. Type definition ───────────────────────────────
  registerLocationProvider(monaco, languageId, providers, "typeDefinition", "registerTypeDefinitionProvider");

  // ── 12. References ────────────────────────────────────
  registerReferences(monaco, languageId, providers);

  // ── 13. Document highlight ────────────────────────────
  registerDocumentHighlight(monaco, languageId, providers);

  // ── 14. Document symbol ───────────────────────────────
  registerDocumentSymbol(monaco, languageId, providers);

  // ── 15. Folding range ─────────────────────────────────
  registerFoldingRange(monaco, languageId, providers);

  // ── 16. Formatting ────────────────────────────────────
  registerFormatting(monaco, languageId, providers);

  // ── 17. Document range formatting ─────────────────────
  registerDocumentRangeFormatting(monaco, languageId, providers);

  // ── 18. On-type formatting ────────────────────────────
  registerOnTypeFormatting(monaco, languageId, providers);

  // ── 19. Inlay hints ───────────────────────────────────
  registerInlayHints(monaco, languageId, providers);

  // ── 20. Inline completions ────────────────────────────
  registerInlineCompletions(monaco, languageId, providers);

  // ── 21. Linked editing range ──────────────────────────
  registerLinkedEditingRange(monaco, languageId, providers);

  // ── 22. Links ─────────────────────────────────────────
  registerLinks(monaco, languageId, providers);

  // ── 23. Rename ────────────────────────────────────────
  registerRename(monaco, languageId, providers);

  // ── 24. Selection range ───────────────────────────────
  registerSelectionRange(monaco, languageId, providers);

  // ── 25. Semantic tokens ───────────────────────────────
  registerSemanticTokens(monaco, languageId, providers);

  // ── 26. Range semantic tokens ─────────────────────────
  registerRangeSemanticTokens(monaco, languageId, providers);

  // ── 27. Multi-document highlight (not standard Monaco API — skip)
  // ── 28. newSymbolNames (not standard Monaco API — skip)
  // ── 29. commands — registered via editor actions, not a provider
}

// ══════════════════════════════════════════════════════════════
// Individual provider registration functions
// ══════════════════════════════════════════════════════════════

type M = typeof import("monaco-editor");
type Providers = Map<string, unknown>;

// ── 1. Monarch tokenizer ────────────────────────────────────

function registerMonarch(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("monarchTokens");
  if (!data || !markRegistered(lang, "monarchTokens")) return;
  try {
    const grammar = convertGrammar(data as Record<string, unknown>);
    monaco.languages.setMonarchTokensProvider(lang, grammar as import("monaco-editor").languages.IMonarchLanguage);
  } catch (e) { warn("monarchTokens", lang, e); }
}

// ── 2. Completion ───────────────────────────────────────────

function registerCompletion(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("completion");
  if (!data || !markRegistered(lang, "completion")) return;
  try {
    const items = Array.isArray(data) ? data : [];
    monaco.languages.registerCompletionItemProvider(lang, {
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        return {
          suggestions: items.map((item: Record<string, unknown>) => ({
            label: (item.label ?? item.name ?? "") as string,
            kind: resolveCompletionKind(monaco, item.kind as string | undefined),
            insertText: (item.insertText ?? item.label ?? item.name ?? "") as string,
            detail: (item.detail ?? "") as string,
            documentation: item.documentation as string | undefined,
            range,
          })),
        };
      },
    });
  } catch (e) { warn("completion", lang, e); }
}

// ── 3. Hover ────────────────────────────────────────────────

function registerHover(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("hover");
  if (!data || !markRegistered(lang, "hover")) return;
  try {
    const entries = Array.isArray(data) ? data : [];
    const hoverMap = new Map<string, string>();
    for (const entry of entries) {
      const e = entry as Record<string, unknown>;
      const key = (e.label ?? e.name ?? "") as string;
      const doc = (e.documentation ?? e.detail ?? e.contents ?? "") as string;
      if (key) hoverMap.set(key, doc);
    }
    monaco.languages.registerHoverProvider(lang, {
      provideHover(model, position) {
        const word = model.getWordAtPosition(position);
        if (!word) return null;
        const doc = hoverMap.get(word.word);
        if (!doc) return null;
        return {
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          },
          contents: [{ value: doc }],
        };
      },
    });
  } catch (e) { warn("hover", lang, e); }
}

// ── 4. Signature help ───────────────────────────────────────

function registerSignatureHelp(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("signatureHelp");
  if (!data || !markRegistered(lang, "signatureHelp")) return;
  try {
    const sigs = Array.isArray(data) ? data : [];
    const sigMap = new Map<string, Record<string, unknown>>();
    for (const s of sigs) {
      const sig = s as Record<string, unknown>;
      const name = (sig.label ?? sig.name ?? "") as string;
      if (name) sigMap.set(name, sig);
    }
    monaco.languages.registerSignatureHelpProvider(lang, {
      signatureHelpTriggerCharacters: ["(", ","],
      provideSignatureHelp(model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        const before = lineContent.substring(0, position.column - 1);
        const fnMatch = before.match(/(\w+)\s*\([^)]*$/);
        if (!fnMatch) return null;
        const fnName = fnMatch[1];
        const sig = sigMap.get(fnName);
        if (!sig) return null;
        const params = (sig.parameters ?? []) as Array<{ label: string; documentation?: string }>;
        return {
          value: {
            signatures: [{
              label: `${fnName}(${params.map((p) => p.label).join(", ")})`,
              parameters: params.map((p) => ({ label: p.label, documentation: p.documentation })),
            }],
            activeSignature: 0,
            activeParameter: (before.match(/,/g) ?? []).length,
          },
          dispose() {},
        };
      },
    });
  } catch (e) { warn("signatureHelp", lang, e); }
}

// ── 5. Code actions ─────────────────────────────────────────

function registerCodeActions(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("codeActions");
  if (!data || !markRegistered(lang, "codeActions")) return;
  try {
    const actions = Array.isArray(data) ? data : [];
    // CDN data: array of { title, kind, diagnosticCode?, edit? }
    monaco.languages.registerCodeActionProvider(lang, {
      provideCodeActions(model, _range, context) {
        const codeActions: import("monaco-editor").languages.CodeAction[] = [];
        for (const a of actions) {
          const action = a as Record<string, unknown>;
          const diagnosticCodes = (action.diagnosticCodes ?? action.diagnosticCode) as string | string[] | undefined;
          const codes = diagnosticCodes ? (Array.isArray(diagnosticCodes) ? diagnosticCodes : [diagnosticCodes]) : null;

          // Only show actions matching current diagnostics (or show all if no filter)
          if (codes && context.markers.length > 0) {
            const match = context.markers.some((m) => codes.includes(String(m.code)));
            if (!match) continue;
          }

          codeActions.push({
            title: (action.title ?? action.label ?? "") as string,
            kind: (action.kind ?? "quickfix") as string,
            diagnostics: context.markers,
            edit: action.edit ? buildWorkspaceEdit(monaco, model, action.edit as Record<string, unknown>) : undefined,
          });
        }
        return { actions: codeActions, dispose() {} };
      },
    });
  } catch (e) { warn("codeActions", lang, e); }
}

// ── 6. Code lens ────────────────────────────────────────────

function registerCodeLens(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("codeLens");
  if (!data || !markRegistered(lang, "codeLens")) return;
  try {
    const lenses = Array.isArray(data) ? data : [];
    // CDN data: array of { pattern, title, command? }
    monaco.languages.registerCodeLensProvider(lang, {
      provideCodeLenses(model) {
        const result: import("monaco-editor").languages.CodeLens[] = [];
        const text = model.getValue();
        for (const lens of lenses) {
          const l = lens as Record<string, unknown>;
          const pattern = l.pattern as string | undefined;
          if (!pattern) continue;
          try {
            const regex = new RegExp(pattern, "gm");
            let match: RegExpExecArray | null;
            while ((match = regex.exec(text)) !== null) {
              const pos = model.getPositionAt(match.index);
              result.push({
                range: {
                  startLineNumber: pos.lineNumber,
                  endLineNumber: pos.lineNumber,
                  startColumn: pos.column,
                  endColumn: pos.column + match[0].length,
                },
                command: {
                  id: (l.command ?? "") as string,
                  title: (l.title ?? "") as string,
                },
              });
            }
          } catch { /* invalid regex — skip */ }
        }
        return { lenses: result, dispose() {} };
      },
    });
  } catch (e) { warn("codeLens", lang, e); }
}

// ── 7. Color provider ───────────────────────────────────────

function registerColor(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("color");
  if (!data || !markRegistered(lang, "color")) return;
  try {
    const patterns = Array.isArray(data) ? data : [];
    // CDN data: array of { pattern } — regex patterns that match color literals
    monaco.languages.registerColorProvider(lang, {
      provideDocumentColors(model) {
        const result: import("monaco-editor").languages.IColorInformation[] = [];
        const text = model.getValue();
        for (const entry of patterns) {
          const { pattern } = entry as { pattern?: string };
          if (!pattern) continue;
          try {
            const regex = new RegExp(pattern, "gi");
            let match: RegExpExecArray | null;
            while ((match = regex.exec(text)) !== null) {
              const pos = model.getPositionAt(match.index);
              const endPos = model.getPositionAt(match.index + match[0].length);
              const color = parseColor(match[0]);
              if (color) {
                result.push({
                  range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: endPos.lineNumber, endColumn: endPos.column },
                  color,
                });
              }
            }
          } catch { /* invalid regex */ }
        }
        return result;
      },
      provideColorPresentations(_model, info) {
        const { red, green, blue, alpha } = info.color;
        const hex = `#${toHex(red)}${toHex(green)}${toHex(blue)}${alpha < 1 ? toHex(alpha) : ""}`;
        return [{ label: hex }];
      },
    });
  } catch (e) { warn("color", lang, e); }
}

// ── 8–11. Location providers (definition, declaration, implementation, typeDefinition) ──

type LocationRegistrar =
  | "registerDefinitionProvider"
  | "registerDeclarationProvider"
  | "registerImplementationProvider"
  | "registerTypeDefinitionProvider";

function registerLocationProvider(
  monaco: M, lang: string, providers: Providers,
  providerName: string, registrar: LocationRegistrar,
): void {
  const data = providers.get(providerName);
  if (!data || !markRegistered(lang, providerName)) return;
  try {
    const entries = Array.isArray(data) ? data : [];
    // CDN data: array of { name, uri, range: { startLine, startCol, endLine, endCol } }
    const symbolMap = new Map<string, Array<{ uri: string; range: { startLine: number; startCol: number; endLine: number; endCol: number } }>>();
    for (const e of entries) {
      const item = e as Record<string, unknown>;
      const name = (item.name ?? item.label ?? "") as string;
      if (!name) continue;
      const uri = (item.uri ?? item.file ?? "") as string;
      const range = item.range as { startLine?: number; startCol?: number; endLine?: number; endCol?: number } | undefined;
      if (!symbolMap.has(name)) symbolMap.set(name, []);
      symbolMap.get(name)!.push({
        uri,
        range: {
          startLine: range?.startLine ?? 1,
          startCol: range?.startCol ?? 1,
          endLine: range?.endLine ?? 1,
          endCol: range?.endCol ?? 1,
        },
      });
    }

    (monaco.languages[registrar] as (lang: string, provider: import("monaco-editor").languages.DefinitionProvider) => import("monaco-editor").IDisposable)(lang, {
      provideDefinition(model, position) {
        const word = model.getWordAtPosition(position);
        if (!word) return null;
        const locations = symbolMap.get(word.word);
        if (!locations) return null;
        return locations.map((loc) => ({
          uri: monaco.Uri.parse(loc.uri || model.uri.toString()),
          range: {
            startLineNumber: loc.range.startLine,
            startColumn: loc.range.startCol,
            endLineNumber: loc.range.endLine,
            endColumn: loc.range.endCol,
          },
        }));
      },
    });
  } catch (e) { warn(providerName, lang, e); }
}

// ── 12. References ──────────────────────────────────────────

function registerReferences(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("references");
  if (!data || !markRegistered(lang, "references")) return;
  try {
    const entries = Array.isArray(data) ? data : [];
    const refMap = buildSymbolLocationMap(entries);
    monaco.languages.registerReferenceProvider(lang, {
      provideReferences(model, position) {
        const word = model.getWordAtPosition(position);
        if (!word) return null;
        const refs = refMap.get(word.word);
        if (!refs) return null;
        return refs.map((r) => ({
          uri: monaco.Uri.parse(r.uri || model.uri.toString()),
          range: {
            startLineNumber: r.range.startLine,
            startColumn: r.range.startCol,
            endLineNumber: r.range.endLine,
            endColumn: r.range.endCol,
          },
        }));
      },
    });
  } catch (e) { warn("references", lang, e); }
}

// ── 13. Document highlight ──────────────────────────────────

function registerDocumentHighlight(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("documentHighlight");
  if (!data || !markRegistered(lang, "documentHighlight")) return;
  try {
    const highlightKinds = data as Record<string, number>;
    // CDN data: { symbolName: kind (1=Text, 2=Read, 3=Write) }
    monaco.languages.registerDocumentHighlightProvider(lang, {
      provideDocumentHighlights(model, position) {
        const word = model.getWordAtPosition(position);
        if (!word) return null;
        const kind = highlightKinds[word.word];
        if (kind === undefined) return null;

        // Find all occurrences of the word in the document
        const text = model.getValue();
        const regex = new RegExp(`\\b${escapeRegex(word.word)}\\b`, "g");
        const results: import("monaco-editor").languages.DocumentHighlight[] = [];
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
          const pos = model.getPositionAt(match.index);
          results.push({
            range: {
              startLineNumber: pos.lineNumber,
              startColumn: pos.column,
              endLineNumber: pos.lineNumber,
              endColumn: pos.column + match[0].length,
            },
            kind: kind as import("monaco-editor").languages.DocumentHighlightKind,
          });
        }
        return results;
      },
    });
  } catch (e) { warn("documentHighlight", lang, e); }
}

// ── 14. Document symbol ─────────────────────────────────────

function registerDocumentSymbol(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("documentSymbol");
  if (!data || !markRegistered(lang, "documentSymbol")) return;
  try {
    const patterns = Array.isArray(data) ? data : [];
    // CDN data: array of { pattern, kind, name? } — regex patterns to extract symbols
    monaco.languages.registerDocumentSymbolProvider(lang, {
      provideDocumentSymbols(model) {
        const result: import("monaco-editor").languages.DocumentSymbol[] = [];
        const text = model.getValue();
        for (const entry of patterns) {
          const p = entry as Record<string, unknown>;
          const pattern = p.pattern as string | undefined;
          const symbolKind = resolveSymbolKind(monaco, p.kind as string | undefined);
          if (!pattern) continue;
          try {
            const regex = new RegExp(pattern, "gm");
            let match: RegExpExecArray | null;
            while ((match = regex.exec(text)) !== null) {
              const pos = model.getPositionAt(match.index);
              const endPos = model.getPositionAt(match.index + match[0].length);
              const name = match[1] ?? match[0]; // capture group 1 = symbol name
              result.push({
                name,
                detail: (p.detail ?? "") as string,
                kind: symbolKind,
                range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: endPos.lineNumber, endColumn: endPos.column },
                selectionRange: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column + name.length },
                tags: [],
              });
            }
          } catch { /* invalid regex */ }
        }
        return result;
      },
    });
  } catch (e) { warn("documentSymbol", lang, e); }
}

// ── 15. Folding range ───────────────────────────────────────

function registerFoldingRange(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("foldingRange");
  if (!data || !markRegistered(lang, "foldingRange")) return;
  try {
    const rules = data as Record<string, unknown>;
    // CDN data: { markers?: { start: string, end: string }, offSide?: boolean }
    const markers = rules.markers as { start?: string; end?: string } | undefined;
    const offSide = !!rules.offSide;

    monaco.languages.registerFoldingRangeProvider(lang, {
      provideFoldingRanges(model) {
        const ranges: import("monaco-editor").languages.FoldingRange[] = [];
        if (markers?.start && markers?.end) {
          const startRegex = new RegExp(markers.start, "gm");
          const endRegex = new RegExp(markers.end, "gm");
          const starts: number[] = [];
          const text = model.getValue();

          // Simple stack-based matching
          const lines = text.split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (startRegex.test(lines[i])) {
              starts.push(i + 1);
              startRegex.lastIndex = 0;
            }
            if (endRegex.test(lines[i]) && starts.length > 0) {
              const start = starts.pop()!;
              ranges.push({ start, end: i + 1, kind: monaco.languages.FoldingRangeKind.Region });
              endRegex.lastIndex = 0;
            }
          }
        }

        // Off-side rule (indentation-based) folding
        if (offSide) {
          const lineCount = model.getLineCount();
          let i = 1;
          while (i <= lineCount) {
            const indent = model.getLineFirstNonWhitespaceColumn(i);
            if (indent === 0) { i++; continue; }
            let end = i;
            for (let j = i + 1; j <= lineCount; j++) {
              const nextIndent = model.getLineFirstNonWhitespaceColumn(j);
              if (nextIndent === 0) continue;
              if (nextIndent > indent) end = j;
              else break;
            }
            if (end > i) ranges.push({ start: i, end, kind: monaco.languages.FoldingRangeKind.Region });
            i = end + 1;
          }
        }

        return ranges;
      },
    });
  } catch (e) { warn("foldingRange", lang, e); }
}

// ── 16. Formatting ──────────────────────────────────────────

function registerFormatting(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("formatting");
  if (!data || !markRegistered(lang, "formatting")) return;
  try {
    const rules = data as Record<string, unknown>;
    // CDN data: { tabSize?, insertSpaces?, rules?: Array<{ pattern, replacement }> }
    const formatRules = (rules.rules ?? []) as Array<{ pattern: string; replacement: string }>;
    monaco.languages.registerDocumentFormattingEditProvider(lang, {
      provideDocumentFormattingEdits(model) {
        let text = model.getValue();
        for (const rule of formatRules) {
          try {
            text = text.replace(new RegExp(rule.pattern, "gm"), rule.replacement);
          } catch { /* invalid regex */ }
        }
        return [{
          range: model.getFullModelRange(),
          text,
        }];
      },
    });
  } catch (e) { warn("formatting", lang, e); }
}

// ── 17. Document range formatting ───────────────────────────

function registerDocumentRangeFormatting(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("documentRangeFormatting");
  if (!data || !markRegistered(lang, "documentRangeFormatting")) return;
  try {
    const rules = data as Record<string, unknown>;
    const formatRules = (rules.rules ?? []) as Array<{ pattern: string; replacement: string }>;
    monaco.languages.registerDocumentRangeFormattingEditProvider(lang, {
      provideDocumentRangeFormattingEdits(model, range) {
        let text = model.getValueInRange(range);
        for (const rule of formatRules) {
          try {
            text = text.replace(new RegExp(rule.pattern, "gm"), rule.replacement);
          } catch { /* invalid regex */ }
        }
        return [{ range, text }];
      },
    });
  } catch (e) { warn("documentRangeFormatting", lang, e); }
}

// ── 18. On-type formatting ──────────────────────────────────

function registerOnTypeFormatting(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("onTypeFormatting");
  if (!data || !markRegistered(lang, "onTypeFormatting")) return;
  try {
    const config = data as Record<string, unknown>;
    // CDN data: { triggerCharacters: string[], rules?: Array<{ pattern, replacement }> }
    const triggers = (config.triggerCharacters ?? [";", "}", "\n"]) as string[];
    const formatRules = (config.rules ?? []) as Array<{ pattern: string; replacement: string }>;
    if (triggers.length === 0) return;

    monaco.languages.registerOnTypeFormattingEditProvider(lang, {
      autoFormatTriggerCharacters: triggers,
      provideOnTypeFormattingEdits(model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        let formatted = lineContent;
        for (const rule of formatRules) {
          try {
            formatted = formatted.replace(new RegExp(rule.pattern, "g"), rule.replacement);
          } catch { /* skip */ }
        }
        if (formatted === lineContent) return [];
        return [{
          range: {
            startLineNumber: position.lineNumber,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: lineContent.length + 1,
          },
          text: formatted,
        }];
      },
    });
  } catch (e) { warn("onTypeFormatting", lang, e); }
}

// ── 19. Inlay hints ─────────────────────────────────────────

function registerInlayHints(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("inlayHints");
  if (!data || !markRegistered(lang, "inlayHints")) return;
  try {
    const entries = Array.isArray(data) ? data : [];
    // CDN data: array of { pattern, label, kind?, position? }
    monaco.languages.registerInlayHintsProvider(lang, {
      provideInlayHints(model, range) {
        const hints: import("monaco-editor").languages.InlayHint[] = [];
        const text = model.getValueInRange(range);
        const offset = model.getOffsetAt({ lineNumber: range.startLineNumber, column: range.startColumn });

        for (const entry of entries) {
          const h = entry as Record<string, unknown>;
          const pattern = h.pattern as string | undefined;
          if (!pattern) continue;
          try {
            const regex = new RegExp(pattern, "gm");
            let match: RegExpExecArray | null;
            while ((match = regex.exec(text)) !== null) {
              const pos = model.getPositionAt(offset + match.index + match[0].length);
              hints.push({
                label: (h.label ?? match[1] ?? "") as string,
                position: { lineNumber: pos.lineNumber, column: pos.column },
                kind: (h.kind === "parameter" ? monaco.languages.InlayHintKind.Parameter : monaco.languages.InlayHintKind.Type),
                paddingLeft: true,
              });
            }
          } catch { /* invalid regex */ }
        }
        return { hints, dispose() {} };
      },
    });
  } catch (e) { warn("inlayHints", lang, e); }
}

// ── 20. Inline completions ──────────────────────────────────

function registerInlineCompletions(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("inlineCompletions");
  if (!data || !markRegistered(lang, "inlineCompletions")) return;
  try {
    const templates = Array.isArray(data) ? data : [];
    // CDN data: array of { trigger, text } — prefix-triggered ghost text
    monaco.languages.registerInlineCompletionsProvider(lang, {
      provideInlineCompletions(model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        const before = lineContent.substring(0, position.column - 1).trimStart();
        const items: import("monaco-editor").languages.InlineCompletion[] = [];

        for (const t of templates) {
          const tpl = t as Record<string, unknown>;
          const trigger = (tpl.trigger ?? tpl.prefix ?? "") as string;
          const text = (tpl.text ?? tpl.insertText ?? "") as string;
          if (trigger && before.endsWith(trigger) && text) {
            items.push({
              insertText: text,
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column - trigger.length,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              },
            });
          }
        }
        return { items };
      },
      disposeInlineCompletions() {},
    });
  } catch (e) { warn("inlineCompletions", lang, e); }
}

// ── 21. Linked editing range ────────────────────────────────

function registerLinkedEditingRange(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("linkedEditingRange");
  if (!data || !markRegistered(lang, "linkedEditingRange")) return;
  try {
    const config = data as Record<string, unknown>;
    // CDN data: { patterns?: string[], wordPattern?: string }
    const patterns = (config.patterns ?? []) as string[];
    const wordPattern = (config.wordPattern ?? "\\w+") as string;

    monaco.languages.registerLinkedEditingRangeProvider(lang, {
      provideLinkedEditingRanges(model, position) {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        // Find matching pairs (e.g. opening/closing HTML tags)
        const text = model.getValue();
        for (const pattern of patterns) {
          try {
            const regex = new RegExp(pattern, "gm");
            let match: RegExpExecArray | null;
            const ranges: import("monaco-editor").IRange[] = [];
            while ((match = regex.exec(text)) !== null) {
              if (match[0].includes(word.word) || (match[1] && match[1] === word.word)) {
                for (let i = 1; i < match.length; i++) {
                  if (match[i] === word.word) {
                    const idx = text.indexOf(match[i], match.index);
                    const pos = model.getPositionAt(idx);
                    ranges.push({
                      startLineNumber: pos.lineNumber,
                      startColumn: pos.column,
                      endLineNumber: pos.lineNumber,
                      endColumn: pos.column + match[i].length,
                    });
                  }
                }
              }
            }
            if (ranges.length >= 2) {
              return { ranges, wordPattern: new RegExp(wordPattern) };
            }
          } catch { /* invalid regex */ }
        }
        return null;
      },
    });
  } catch (e) { warn("linkedEditingRange", lang, e); }
}

// ── 22. Links ───────────────────────────────────────────────

function registerLinks(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("links");
  if (!data || !markRegistered(lang, "links")) return;
  try {
    const patterns = Array.isArray(data) ? data : [];
    // CDN data: array of { pattern, url? } — regex patterns that match linkable text
    monaco.languages.registerLinkProvider(lang, {
      provideLinks(model) {
        const result: import("monaco-editor").languages.ILink[] = [];
        const text = model.getValue();

        for (const entry of patterns) {
          const l = entry as Record<string, unknown>;
          const pattern = l.pattern as string | undefined;
          if (!pattern) continue;
          try {
            const regex = new RegExp(pattern, "gm");
            let match: RegExpExecArray | null;
            while ((match = regex.exec(text)) !== null) {
              const pos = model.getPositionAt(match.index);
              const endPos = model.getPositionAt(match.index + match[0].length);
              const url = (match[1] ?? l.url ?? match[0]) as string;
              result.push({
                range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: endPos.lineNumber, endColumn: endPos.column },
                url: monaco.Uri.parse(url),
              });
            }
          } catch { /* invalid regex */ }
        }
        return { links: result };
      },
    });
  } catch (e) { warn("links", lang, e); }
}

// ── 23. Rename ──────────────────────────────────────────────

function registerRename(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("rename");
  if (!data || !markRegistered(lang, "rename")) return;
  try {
    // CDN data: { wordPattern?: string } — rename is mostly word-based
    const config = data as Record<string, unknown>;
    const wordPattern = (config.wordPattern ?? "\\w+") as string;

    monaco.languages.registerRenameProvider(lang, {
      provideRenameEdits(model, position, newName) {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const text = model.getValue();
        const regex = new RegExp(`\\b${escapeRegex(word.word)}\\b`, "g");
        const edits: import("monaco-editor").languages.IWorkspaceTextEdit[] = [];
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
          const pos = model.getPositionAt(match.index);
          edits.push({
            resource: model.uri,
            textEdit: {
              range: {
                startLineNumber: pos.lineNumber,
                startColumn: pos.column,
                endLineNumber: pos.lineNumber,
                endColumn: pos.column + match[0].length,
              },
              text: newName,
            },
            versionId: model.getVersionId(),
          });
        }
        return { edits };
      },

      resolveRenameLocation(model, position) {
        const word = model.getWordAtPosition(position);
        if (!word) return { rejectReason: "No symbol found", text: "", range: { startLineNumber: 0, startColumn: 0, endLineNumber: 0, endColumn: 0 } };
        const regex = new RegExp(wordPattern);
        if (!regex.test(word.word)) return { rejectReason: "Not a renameable symbol", text: "", range: { startLineNumber: 0, startColumn: 0, endLineNumber: 0, endColumn: 0 } };
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
  } catch (e) { warn("rename", lang, e); }
}

// ── 24. Selection range ─────────────────────────────────────

function registerSelectionRange(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("selectionRange");
  if (!data || !markRegistered(lang, "selectionRange")) return;
  try {
    const config = data as Record<string, unknown>;
    // CDN data: { bracketPairs?: string[][] } — pairs of open/close brackets for smart select
    const pairs = (config.bracketPairs ?? [["(", ")"], ["[", "]"], ["{", "}"]]) as string[][];

    monaco.languages.registerSelectionRangeProvider(lang, {
      provideSelectionRanges(model, positions) {
        return positions.map((position) => {
          const ranges: import("monaco-editor").languages.SelectionRange[] = [];
          // Word selection
          const word = model.getWordAtPosition(position);
          if (word) {
            ranges.push({
              range: { startLineNumber: position.lineNumber, startColumn: word.startColumn, endLineNumber: position.lineNumber, endColumn: word.endColumn },
            });
          }
          // Line selection
          ranges.push({
            range: {
              startLineNumber: position.lineNumber,
              startColumn: model.getLineFirstNonWhitespaceColumn(position.lineNumber),
              endLineNumber: position.lineNumber,
              endColumn: model.getLineMaxColumn(position.lineNumber),
            },
          });
          // Bracket-pair expansion
          for (const [open, close] of pairs) {
            const text = model.getValue();
            const offset = model.getOffsetAt(position);
            let depth = 0;
            let start = -1;
            for (let i = offset; i >= 0; i--) {
              if (text[i] === close) depth++;
              if (text[i] === open) {
                if (depth === 0) { start = i; break; }
                depth--;
              }
            }
            if (start >= 0) {
              depth = 0;
              for (let i = offset; i < text.length; i++) {
                if (text[i] === open) depth++;
                if (text[i] === close) {
                  if (depth === 0) {
                    const startPos = model.getPositionAt(start);
                    const endPos = model.getPositionAt(i + 1);
                    ranges.push({
                      range: { startLineNumber: startPos.lineNumber, startColumn: startPos.column, endLineNumber: endPos.lineNumber, endColumn: endPos.column },
                    });
                    break;
                  }
                  depth--;
                }
              }
            }
          }
          // Full document
          ranges.push({ range: model.getFullModelRange() });
          return ranges;
        });
      },
    });
  } catch (e) { warn("selectionRange", lang, e); }
}

// ── 25. Semantic tokens ─────────────────────────────────────

function registerSemanticTokens(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("semanticTokens");
  if (!data || !markRegistered(lang, "semanticTokens")) return;
  try {
    const config = data as Record<string, unknown>;
    // CDN data: { tokenTypes: string[], tokenModifiers: string[], rules: Array<{ pattern, type, modifiers? }> }
    const tokenTypes = (config.tokenTypes ?? ["variable", "function", "class", "interface", "parameter", "property", "type", "keyword", "string", "number", "comment"]) as string[];
    const tokenModifiers = (config.tokenModifiers ?? ["declaration", "definition", "readonly", "static", "async"]) as string[];
    const rules = (config.rules ?? []) as Array<{ pattern: string; type: string; modifiers?: string[] }>;

    const legend: import("monaco-editor").languages.SemanticTokensLegend = { tokenTypes, tokenModifiers };

    monaco.languages.registerDocumentSemanticTokensProvider(lang, {
      getLegend: () => legend,
      provideDocumentSemanticTokens(model) {
        const text = model.getValue();
        const dataArray: number[] = [];
        let prevLine = 0;
        let prevCol = 0;

        // Collect all matches, sort by position
        const matches: Array<{ line: number; col: number; length: number; typeIndex: number; modMask: number }> = [];
        for (const rule of rules) {
          try {
            const regex = new RegExp(rule.pattern, "gm");
            const typeIndex = tokenTypes.indexOf(rule.type);
            if (typeIndex === -1) continue;
            let modMask = 0;
            for (const mod of (rule.modifiers ?? [])) {
              const idx = tokenModifiers.indexOf(mod);
              if (idx >= 0) modMask |= (1 << idx);
            }
            let match: RegExpExecArray | null;
            while ((match = regex.exec(text)) !== null) {
              const pos = model.getPositionAt(match.index);
              matches.push({ line: pos.lineNumber - 1, col: pos.column - 1, length: match[0].length, typeIndex, modMask });
            }
          } catch { /* invalid regex */ }
        }

        // Sort by line then column
        matches.sort((a, b) => a.line - b.line || a.col - b.col);

        for (const m of matches) {
          const deltaLine = m.line - prevLine;
          const deltaCol = deltaLine === 0 ? m.col - prevCol : m.col;
          dataArray.push(deltaLine, deltaCol, m.length, m.typeIndex, m.modMask);
          prevLine = m.line;
          prevCol = m.col;
        }

        return { data: new Uint32Array(dataArray) };
      },
      releaseDocumentSemanticTokens() {},
    });
  } catch (e) { warn("semanticTokens", lang, e); }
}

// ── 26. Range semantic tokens ───────────────────────────────

function registerRangeSemanticTokens(monaco: M, lang: string, providers: Providers): void {
  const data = providers.get("rangeSemanticTokens");
  if (!data || !markRegistered(lang, "rangeSemanticTokens")) return;
  try {
    const config = data as Record<string, unknown>;
    const tokenTypes = (config.tokenTypes ?? ["variable", "function", "class", "interface", "parameter", "property", "type", "keyword", "string", "number", "comment"]) as string[];
    const tokenModifiers = (config.tokenModifiers ?? ["declaration", "definition", "readonly", "static", "async"]) as string[];
    const rules = (config.rules ?? []) as Array<{ pattern: string; type: string; modifiers?: string[] }>;

    const legend: import("monaco-editor").languages.SemanticTokensLegend = { tokenTypes, tokenModifiers };

    monaco.languages.registerDocumentRangeSemanticTokensProvider(lang, {
      getLegend: () => legend,
      provideDocumentRangeSemanticTokens(model, range) {
        const text = model.getValueInRange(range);
        const baseOffset = model.getOffsetAt({ lineNumber: range.startLineNumber, column: range.startColumn });
        const dataArray: number[] = [];
        let prevLine = 0;
        let prevCol = 0;

        const matches: Array<{ line: number; col: number; length: number; typeIndex: number; modMask: number }> = [];
        for (const rule of rules) {
          try {
            const regex = new RegExp(rule.pattern, "gm");
            const typeIndex = tokenTypes.indexOf(rule.type);
            if (typeIndex === -1) continue;
            let modMask = 0;
            for (const mod of (rule.modifiers ?? [])) {
              const idx = tokenModifiers.indexOf(mod);
              if (idx >= 0) modMask |= (1 << idx);
            }
            let match: RegExpExecArray | null;
            while ((match = regex.exec(text)) !== null) {
              const pos = model.getPositionAt(baseOffset + match.index);
              matches.push({ line: pos.lineNumber - 1, col: pos.column - 1, length: match[0].length, typeIndex, modMask });
            }
          } catch { /* invalid regex */ }
        }

        matches.sort((a, b) => a.line - b.line || a.col - b.col);
        for (const m of matches) {
          const deltaLine = m.line - prevLine;
          const deltaCol = deltaLine === 0 ? m.col - prevCol : m.col;
          dataArray.push(deltaLine, deltaCol, m.length, m.typeIndex, m.modMask);
          prevLine = m.line;
          prevCol = m.col;
        }

        return { data: new Uint32Array(dataArray) };
      },
    });
  } catch (e) { warn("rangeSemanticTokens", lang, e); }
}

// ══════════════════════════════════════════════════════════════
// Shared helpers
// ══════════════════════════════════════════════════════════════

function warn(provider: string, lang: string, e: unknown): void {
  console.warn(`[context-engine] ${provider} registration failed for ${lang}:`, e);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toHex(n: number): string {
  return Math.round(n * 255).toString(16).padStart(2, "0");
}

function parseColor(value: string): { red: number; green: number; blue: number; alpha: number } | null {
  // #rrggbb or #rrggbbaa
  const hex = value.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i);
  if (hex) {
    return {
      red: parseInt(hex[1], 16) / 255,
      green: parseInt(hex[2], 16) / 255,
      blue: parseInt(hex[3], 16) / 255,
      alpha: hex[4] ? parseInt(hex[4], 16) / 255 : 1,
    };
  }
  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgb = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (rgb) {
    return {
      red: parseInt(rgb[1]) / 255,
      green: parseInt(rgb[2]) / 255,
      blue: parseInt(rgb[3]) / 255,
      alpha: rgb[4] ? parseFloat(rgb[4]) : 1,
    };
  }
  return null;
}

function buildSymbolLocationMap(entries: unknown[]): Map<string, Array<{ uri: string; range: { startLine: number; startCol: number; endLine: number; endCol: number } }>> {
  const map = new Map<string, Array<{ uri: string; range: { startLine: number; startCol: number; endLine: number; endCol: number } }>>();
  for (const e of entries) {
    const item = e as Record<string, unknown>;
    const name = (item.name ?? item.label ?? "") as string;
    if (!name) continue;
    const uri = (item.uri ?? item.file ?? "") as string;
    const range = item.range as { startLine?: number; startCol?: number; endLine?: number; endCol?: number } | undefined;
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push({
      uri,
      range: { startLine: range?.startLine ?? 1, startCol: range?.startCol ?? 1, endLine: range?.endLine ?? 1, endCol: range?.endCol ?? 1 },
    });
  }
  return map;
}

function buildWorkspaceEdit(
  _monaco: typeof import("monaco-editor"),
  model: import("monaco-editor").editor.ITextModel,
  edit: Record<string, unknown>,
): import("monaco-editor").languages.WorkspaceEdit {
  const changes = (edit.changes ?? edit.edits ?? []) as Array<{ range?: { startLine: number; startCol: number; endLine: number; endCol: number }; text?: string }>;
  return {
    edits: changes.map((c) => ({
      resource: model.uri,
      textEdit: {
        range: c.range ? {
          startLineNumber: c.range.startLine, startColumn: c.range.startCol,
          endLineNumber: c.range.endLine, endColumn: c.range.endCol,
        } : model.getFullModelRange(),
        text: (c.text ?? "") as string,
      },
      versionId: model.getVersionId(),
    })),
  };
}

function resolveCompletionKind(
  monaco: M,
  kind: string | undefined,
): import("monaco-editor").languages.CompletionItemKind {
  if (!kind) return monaco.languages.CompletionItemKind.Text;
  const k = kind.toLowerCase();
  const map: Record<string, import("monaco-editor").languages.CompletionItemKind> = {
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
    unit: monaco.languages.CompletionItemKind.Unit,
    value: monaco.languages.CompletionItemKind.Value,
    constant: monaco.languages.CompletionItemKind.Constant,
    enum: monaco.languages.CompletionItemKind.Enum,
    enummember: monaco.languages.CompletionItemKind.EnumMember,
    keyword: monaco.languages.CompletionItemKind.Keyword,
    snippet: monaco.languages.CompletionItemKind.Snippet,
    text: monaco.languages.CompletionItemKind.Text,
    color: monaco.languages.CompletionItemKind.Color,
    file: monaco.languages.CompletionItemKind.File,
    reference: monaco.languages.CompletionItemKind.Reference,
    folder: monaco.languages.CompletionItemKind.Folder,
    typeparameter: monaco.languages.CompletionItemKind.TypeParameter,
    operator: monaco.languages.CompletionItemKind.Operator,
  };
  return map[k] ?? monaco.languages.CompletionItemKind.Text;
}

function resolveSymbolKind(
  monaco: M,
  kind: string | undefined,
): import("monaco-editor").languages.SymbolKind {
  if (!kind) return monaco.languages.SymbolKind.Variable;
  const k = kind.toLowerCase();
  const map: Record<string, import("monaco-editor").languages.SymbolKind> = {
    file: monaco.languages.SymbolKind.File,
    module: monaco.languages.SymbolKind.Module,
    namespace: monaco.languages.SymbolKind.Namespace,
    package: monaco.languages.SymbolKind.Package,
    class: monaco.languages.SymbolKind.Class,
    method: monaco.languages.SymbolKind.Method,
    property: monaco.languages.SymbolKind.Property,
    field: monaco.languages.SymbolKind.Field,
    constructor: monaco.languages.SymbolKind.Constructor,
    enum: monaco.languages.SymbolKind.Enum,
    interface: monaco.languages.SymbolKind.Interface,
    function: monaco.languages.SymbolKind.Function,
    variable: monaco.languages.SymbolKind.Variable,
    constant: monaco.languages.SymbolKind.Constant,
    string: monaco.languages.SymbolKind.String,
    number: monaco.languages.SymbolKind.Number,
    boolean: monaco.languages.SymbolKind.Boolean,
    array: monaco.languages.SymbolKind.Array,
    object: monaco.languages.SymbolKind.Object,
    key: monaco.languages.SymbolKind.Key,
    event: monaco.languages.SymbolKind.Event,
    operator: monaco.languages.SymbolKind.Operator,
    typeparameter: monaco.languages.SymbolKind.TypeParameter,
    struct: monaco.languages.SymbolKind.Struct,
  };
  return map[k] ?? monaco.languages.SymbolKind.Variable;
}
