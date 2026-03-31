// ── LSP Bridge Module — LSP ↔ Monaco Converters ───────────────
// See context/lsp-bridge-module.txt Section 7
//
// Bidirectional converters between LSP protocol types and Monaco editor types.
// Used exclusively by V2 (Built-in) client for provider registration.

import type * as monacoNs from "monaco-editor";

// Store Monaco reference for URI parsing
let monacoRef: typeof monacoNs | null = null;

export function setMonacoRef(monaco: typeof monacoNs): void {
  monacoRef = monaco;
}

function monacoUri(uriStr: string): monacoNs.Uri {
  return monacoRef!.Uri.parse(uriStr);
}

// ── LSP namespace types (structural, no external dependency) ──

interface LspPosition { line: number; character: number }
interface LspRange { start: LspPosition; end: LspPosition }
interface LspLocation { uri: string; range: LspRange }
interface LspLocationLink {
  originSelectionRange?: LspRange;
  targetUri: string;
  targetRange: LspRange;
  targetSelectionRange: LspRange;
}
interface LspDiagnostic {
  range: LspRange;
  severity?: number;
  code?: string | number;
  source?: string;
  message: string;
}
interface LspCompletionItem {
  label: string | { label: string; detail?: string; description?: string };
  kind?: number;
  detail?: string;
  documentation?: string | { kind: string; value: string };
  insertText?: string;
  insertTextFormat?: number;
  sortText?: string;
  filterText?: string;
  preselect?: boolean;
  textEdit?: { range: LspRange; newText: string } | { insert: LspRange; replace: LspRange; newText: string };
  additionalTextEdits?: LspTextEdit[];
  tags?: number[];
}
interface LspHover {
  contents: string | { language: string; value: string } | { kind: string; value: string } | Array<string | { language: string; value: string }>;
  range?: LspRange;
}
interface LspSignatureHelp {
  signatures: LspSignatureInformation[];
  activeSignature?: number;
  activeParameter?: number;
}
interface LspSignatureInformation {
  label: string;
  documentation?: string | { kind: string; value: string };
  parameters?: LspParameterInformation[];
}
interface LspParameterInformation {
  label: string | [number, number];
  documentation?: string | { kind: string; value: string };
}
interface LspDocumentSymbol {
  name: string;
  detail?: string;
  kind: number;
  tags?: number[];
  range: LspRange;
  selectionRange: LspRange;
  children?: LspDocumentSymbol[];
}
interface LspCodeAction {
  title: string;
  kind?: string;
  isPreferred?: boolean;
  disabled?: { reason: string };
  edit?: LspWorkspaceEdit;
  command?: LspCommand;
  diagnostics?: LspDiagnostic[];
}
interface LspCommand { title: string; command: string; arguments?: unknown[] }
interface LspWorkspaceEdit {
  changes?: Record<string, LspTextEdit[]>;
  documentChanges?: Array<{ textDocument: { uri: string; version?: number | null }; edits: LspTextEdit[] }>;
}
interface LspTextEdit { range: LspRange; newText: string }
interface LspCodeLens { range: LspRange; command?: LspCommand }
interface LspDocumentLink { range: LspRange; target?: string; tooltip?: string }
interface LspColorInformation { range: LspRange; color: LspColor }
interface LspColor { red: number; green: number; blue: number; alpha: number }
interface LspColorPresentation { label: string; textEdit?: LspTextEdit; additionalTextEdits?: LspTextEdit[] }
interface LspFoldingRange { startLine: number; startCharacter?: number; endLine: number; endCharacter?: number; kind?: string }
interface LspSelectionRange { range: LspRange; parent?: LspSelectionRange }
interface LspLinkedEditingRanges { ranges: LspRange[]; wordPattern?: string }
interface LspInlayHint {
  position: LspPosition;
  label: string | LspInlayHintLabelPart[];
  kind?: number;
  tooltip?: string | { kind: string; value: string };
  textEdits?: LspTextEdit[];
  paddingLeft?: boolean;
  paddingRight?: boolean;
}
interface LspInlayHintLabelPart {
  value: string;
  tooltip?: string | { kind: string; value: string };
  location?: LspLocation;
  command?: LspCommand;
}
interface LspSemanticTokens { resultId?: string; data: number[] }
interface LspDocumentHighlight { range: LspRange; kind?: number }

// ── 7A — Position / Range / Location ──────────────────────────

export function toMonacoPosition(pos: LspPosition): monacoNs.IPosition {
  return { lineNumber: pos.line + 1, column: pos.character + 1 };
}

export function fromMonacoPosition(pos: monacoNs.IPosition): LspPosition {
  return { line: pos.lineNumber - 1, character: pos.column - 1 };
}

export function toMonacoRange(range: LspRange): monacoNs.IRange {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  };
}

export function fromMonacoRange(range: monacoNs.IRange): LspRange {
  return {
    start: { line: range.startLineNumber - 1, character: range.startColumn - 1 },
    end: { line: range.endLineNumber - 1, character: range.endColumn - 1 },
  };
}

// ── 7B — Completion ───────────────────────────────────────────

const LSP_TO_MONACO_COMPLETION_KIND: Record<number, monacoNs.languages.CompletionItemKind> = {};

function initCompletionKindMap(monaco: typeof monacoNs): void {
  if (LSP_TO_MONACO_COMPLETION_KIND[1]) return;
  const CK = monaco.languages.CompletionItemKind;
  const map: Record<number, monacoNs.languages.CompletionItemKind> = {
    1: CK.Text, 2: CK.Method, 3: CK.Function, 4: CK.Constructor,
    5: CK.Field, 6: CK.Variable, 7: CK.Class, 8: CK.Interface,
    9: CK.Module, 10: CK.Property, 11: CK.Unit, 12: CK.Value,
    13: CK.Enum, 14: CK.Keyword, 15: CK.Snippet, 16: CK.Color,
    17: CK.File, 18: CK.Reference, 19: CK.Folder, 20: CK.EnumMember,
    21: CK.Constant, 22: CK.Struct, 23: CK.Event, 24: CK.Operator,
    25: CK.TypeParameter,
  };
  Object.assign(LSP_TO_MONACO_COMPLETION_KIND, map);
}

export function toMonacoCompletionItem(
  monaco: typeof monacoNs,
  item: LspCompletionItem,
  defaultRange: monacoNs.IRange,
): monacoNs.languages.CompletionItem {
  initCompletionKindMap(monaco);

  const label = typeof item.label === "string" ? item.label : item.label.label;
  const insertText = item.insertText ?? label;
  const isSnippet = item.insertTextFormat === 2;

  let range: monacoNs.IRange | { insert: monacoNs.IRange; replace: monacoNs.IRange } = defaultRange;
  if (item.textEdit) {
    if ("range" in item.textEdit) {
      range = toMonacoRange(item.textEdit.range);
    } else if ("insert" in item.textEdit) {
      range = {
        insert: toMonacoRange(item.textEdit.insert),
        replace: toMonacoRange(item.textEdit.replace),
      };
    }
  }

  let documentation: string | monacoNs.IMarkdownString | undefined;
  if (typeof item.documentation === "string") {
    documentation = item.documentation;
  } else if (item.documentation && "value" in item.documentation) {
    documentation = item.documentation.kind === "markdown"
      ? { value: item.documentation.value }
      : item.documentation.value;
  }

  return {
    label: typeof item.label === "string" ? item.label : {
      label: item.label.label,
      detail: item.label.detail,
      description: item.label.description,
    },
    kind: LSP_TO_MONACO_COMPLETION_KIND[item.kind ?? 1] ?? monaco.languages.CompletionItemKind.Text,
    detail: item.detail,
    documentation,
    insertText: isSnippet ? insertText : insertText,
    insertTextRules: isSnippet
      ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      : undefined,
    range,
    sortText: item.sortText,
    filterText: item.filterText,
    preselect: item.preselect,
    tags: item.tags as monacoNs.languages.CompletionItemTag[],
    additionalTextEdits: item.additionalTextEdits?.map(toMonacoTextEdit),
  };
}

// ── 7C — Hover ────────────────────────────────────────────────

export function toMonacoHover(hover: LspHover): monacoNs.languages.Hover {
  const contents: monacoNs.IMarkdownString[] = [];

  if (typeof hover.contents === "string") {
    contents.push({ value: hover.contents });
  } else if (Array.isArray(hover.contents)) {
    for (const c of hover.contents) {
      if (typeof c === "string") {
        contents.push({ value: c });
      } else if ("language" in c) {
        contents.push({ value: `\`\`\`${c.language}\n${c.value}\n\`\`\`` });
      }
    }
  } else if ("kind" in hover.contents) {
    contents.push({ value: hover.contents.value });
  } else if ("language" in hover.contents) {
    contents.push({ value: `\`\`\`${hover.contents.language}\n${hover.contents.value}\n\`\`\`` });
  }

  return {
    contents,
    range: hover.range ? toMonacoRange(hover.range) : undefined,
  };
}

// ── 7D — Diagnostics ──────────────────────────────────────────

export function toMonacoSeverity(
  monaco: typeof monacoNs,
  severity: number | undefined,
): monacoNs.MarkerSeverity {
  switch (severity) {
    case 1: return monaco.MarkerSeverity.Error;
    case 2: return monaco.MarkerSeverity.Warning;
    case 3: return monaco.MarkerSeverity.Info;
    case 4: return monaco.MarkerSeverity.Hint;
    default: return monaco.MarkerSeverity.Info;
  }
}

export function toMonacoMarkers(
  monaco: typeof monacoNs,
  diagnostics: LspDiagnostic[],
): monacoNs.editor.IMarkerData[] {
  return diagnostics.map((d) => ({
    severity: toMonacoSeverity(monaco, d.severity),
    message: d.message,
    source: d.source,
    code: d.code != null ? String(d.code) : undefined,
    startLineNumber: d.range.start.line + 1,
    startColumn: d.range.start.character + 1,
    endLineNumber: d.range.end.line + 1,
    endColumn: d.range.end.character + 1,
  }));
}

// ── 7E — Signature Help ───────────────────────────────────────

export function toMonacoSignatureHelp(
  sh: LspSignatureHelp,
): monacoNs.languages.SignatureHelpResult {
  return {
    value: {
      signatures: sh.signatures.map((sig) => {
        let documentation: string | monacoNs.IMarkdownString | undefined;
        if (typeof sig.documentation === "string") {
          documentation = sig.documentation;
        } else if (sig.documentation) {
          documentation = { value: sig.documentation.value };
        }

        return {
          label: sig.label,
          documentation,
          parameters: (sig.parameters ?? []).map((p) => {
            let paramDoc: string | monacoNs.IMarkdownString | undefined;
            if (typeof p.documentation === "string") {
              paramDoc = p.documentation;
            } else if (p.documentation) {
              paramDoc = { value: p.documentation.value };
            }
            return { label: p.label, documentation: paramDoc };
          }),
        };
      }),
      activeSignature: sh.activeSignature ?? 0,
      activeParameter: sh.activeParameter ?? 0,
    },
    dispose: () => {},
  };
}

// ── 7F — Definition / References ──────────────────────────────

export function toMonacoDefinition(
  result: LspLocation | LspLocation[] | LspLocationLink[] | null,
): monacoNs.languages.Definition | null {
  if (!result) return null;

  if (Array.isArray(result)) {
    if (result.length === 0) return null;

    // LocationLink[]
    if ("targetUri" in result[0]) {
      return (result as LspLocationLink[]).map((link) => ({
        uri: monacoUri(link.targetUri),
        range: toMonacoRange(link.targetRange),
        originSelectionRange: link.originSelectionRange
          ? toMonacoRange(link.originSelectionRange)
          : undefined,
        targetSelectionRange: toMonacoRange(link.targetSelectionRange),
      }));
    }

    // Location[]
    return (result as LspLocation[]).map((loc) => ({
      uri: monacoUri(loc.uri),
      range: toMonacoRange(loc.range),
    }));
  }

  // Single Location
  return {
    uri: monacoUri(result.uri),
    range: toMonacoRange(result.range),
  };
}

// ── 7G — Document Symbols ─────────────────────────────────────

const LSP_TO_MONACO_SYMBOL_KIND: Record<number, monacoNs.languages.SymbolKind> = {};

function initSymbolKindMap(monaco: typeof monacoNs): void {
  if (LSP_TO_MONACO_SYMBOL_KIND[1]) return;
  const SK = monaco.languages.SymbolKind;
  // LSP SymbolKind (1-26) → Monaco SymbolKind (complete mapping)
  LSP_TO_MONACO_SYMBOL_KIND[1]  = SK.File;
  LSP_TO_MONACO_SYMBOL_KIND[2]  = SK.Module;
  LSP_TO_MONACO_SYMBOL_KIND[3]  = SK.Namespace;
  LSP_TO_MONACO_SYMBOL_KIND[4]  = SK.Package;
  LSP_TO_MONACO_SYMBOL_KIND[5]  = SK.Class;
  LSP_TO_MONACO_SYMBOL_KIND[6]  = SK.Method;
  LSP_TO_MONACO_SYMBOL_KIND[7]  = SK.Property;
  LSP_TO_MONACO_SYMBOL_KIND[8]  = SK.Field;
  LSP_TO_MONACO_SYMBOL_KIND[9]  = SK.Constructor;
  LSP_TO_MONACO_SYMBOL_KIND[10] = SK.Enum;
  LSP_TO_MONACO_SYMBOL_KIND[11] = SK.Interface;
  LSP_TO_MONACO_SYMBOL_KIND[12] = SK.Function;
  LSP_TO_MONACO_SYMBOL_KIND[13] = SK.Variable;
  LSP_TO_MONACO_SYMBOL_KIND[14] = SK.Constant;
  LSP_TO_MONACO_SYMBOL_KIND[15] = SK.String;
  LSP_TO_MONACO_SYMBOL_KIND[16] = SK.Number;
  LSP_TO_MONACO_SYMBOL_KIND[17] = SK.Boolean;
  LSP_TO_MONACO_SYMBOL_KIND[18] = SK.Array;
  LSP_TO_MONACO_SYMBOL_KIND[19] = SK.Object;
  LSP_TO_MONACO_SYMBOL_KIND[20] = SK.Key;
  LSP_TO_MONACO_SYMBOL_KIND[21] = SK.Null;
  LSP_TO_MONACO_SYMBOL_KIND[22] = SK.EnumMember;
  LSP_TO_MONACO_SYMBOL_KIND[23] = SK.Struct;
  LSP_TO_MONACO_SYMBOL_KIND[24] = SK.Event;
  LSP_TO_MONACO_SYMBOL_KIND[25] = SK.Operator;
  LSP_TO_MONACO_SYMBOL_KIND[26] = SK.TypeParameter;
}

export function toMonacoDocumentSymbols(
  monaco: typeof monacoNs,
  symbols: LspDocumentSymbol[],
): monacoNs.languages.DocumentSymbol[] {
  initSymbolKindMap(monaco);

  function convert(syms: LspDocumentSymbol[]): monacoNs.languages.DocumentSymbol[] {
    return syms
      .filter((s) => s.range && s.selectionRange)
      .map((s) => ({
        name: s.name,
        detail: s.detail ?? "",
        kind: LSP_TO_MONACO_SYMBOL_KIND[s.kind] ?? monaco.languages.SymbolKind.Variable,
        tags: (s.tags ?? []) as monacoNs.languages.SymbolTag[],
        range: toMonacoRange(s.range),
        selectionRange: toMonacoRange(s.selectionRange),
        children: s.children ? convert(s.children) : undefined,
      }));
  }

  return convert(symbols);
}

// ── 7H — Code Actions ─────────────────────────────────────────

export function toMonacoCommand(cmd: LspCommand): monacoNs.languages.Command {
  return {
    id: cmd.command,
    title: cmd.title.replace(/\$\([^)]+\)\s*/g, ""), // Strip VS Code codicon syntax
    arguments: cmd.arguments,
  };
}

export function toMonacoWorkspaceEdit(
  edit: LspWorkspaceEdit,
): monacoNs.languages.WorkspaceEdit {
  const edits: monacoNs.languages.IWorkspaceTextEdit[] = [];

  if (edit.changes) {
    for (const [uri, textEdits] of Object.entries(edit.changes)) {
      for (const te of textEdits) {
        edits.push({
          resource: monacoUri(uri),
          textEdit: { range: toMonacoRange(te.range), text: te.newText },
          versionId: undefined,
        });
      }
    }
  }

  if (edit.documentChanges) {
    for (const change of edit.documentChanges) {
      const uri = change.textDocument.uri;
      for (const te of change.edits) {
        edits.push({
          resource: monacoUri(uri),
          textEdit: { range: toMonacoRange(te.range), text: te.newText },
          versionId: undefined,
        });
      }
    }
  }

  return { edits };
}

export function toMonacoCodeActions(
  monaco: typeof monacoNs,
  actions: Array<LspCodeAction | LspCommand>,
): monacoNs.languages.CodeActionList {
  const codeActions: monacoNs.languages.CodeAction[] = actions.map((action) => {
    // Distinguish Command vs CodeAction
    if ("command" in action && !("title" in action && "kind" in action)) {
      const cmd = action as LspCommand;
      return {
        title: cmd.title.replace(/\$\([^)]+\)\s*/g, ""),
        command: toMonacoCommand(cmd),
      };
    }

    const ca = action as LspCodeAction;
    return {
      title: ca.title,
      kind: ca.kind,
      isPreferred: ca.isPreferred,
      disabled: ca.disabled?.reason,
      edit: ca.edit ? toMonacoWorkspaceEdit(ca.edit) : undefined,
      command: ca.command ? toMonacoCommand(ca.command) : undefined,
      diagnostics: ca.diagnostics?.map((d) => ({
        severity: toMonacoSeverity(monaco, d.severity),
        message: d.message,
        startLineNumber: d.range.start.line + 1,
        startColumn: d.range.start.character + 1,
        endLineNumber: d.range.end.line + 1,
        endColumn: d.range.end.character + 1,
      })),
    };
  });

  return {
    actions: codeActions,
    dispose: () => {},
  };
}

// ── 7I — Code Lens ────────────────────────────────────────────

export function toMonacoCodeLens(
  lens: LspCodeLens,
): monacoNs.languages.CodeLens {
  return {
    range: toMonacoRange(lens.range),
    command: lens.command ? toMonacoCommand(lens.command) : undefined,
  };
}

// ── 7J — Text Edits / Formatting ──────────────────────────────

export function toMonacoTextEdit(
  edit: LspTextEdit,
): monacoNs.languages.TextEdit {
  return {
    range: toMonacoRange(edit.range),
    text: edit.newText,
  };
}

export function toMonacoTextEdits(
  edits: LspTextEdit[] | null | undefined,
): monacoNs.languages.TextEdit[] {
  if (!edits) return [];
  return edits.map(toMonacoTextEdit);
}

// ── 7K — Document Links ──────────────────────────────────────

export function toMonacoDocumentLink(
  link: LspDocumentLink,
): monacoNs.languages.ILink {
  return {
    range: toMonacoRange(link.range),
    url: link.target,
    tooltip: link.tooltip,
  };
}

// ── 7L — Document Colors ─────────────────────────────────────

export function toMonacoColorInformation(
  info: LspColorInformation,
): monacoNs.languages.IColorInformation {
  return {
    range: toMonacoRange(info.range),
    color: info.color,
  };
}

export function toMonacoColorPresentation(
  pres: LspColorPresentation,
): monacoNs.languages.IColorPresentation {
  return {
    label: pres.label,
    textEdit: pres.textEdit ? toMonacoTextEdit(pres.textEdit) : undefined,
    additionalTextEdits: pres.additionalTextEdits?.map(toMonacoTextEdit),
  };
}

export function fromMonacoColor(color: monacoNs.languages.IColor): LspColor {
  return { red: color.red, green: color.green, blue: color.blue, alpha: color.alpha };
}

// ── 7M — Folding Ranges ──────────────────────────────────────

const LSP_FOLDING_KIND_MAP: Record<string, monacoNs.languages.FoldingRangeKind | undefined> = {};

function initFoldingKindMap(monaco: typeof monacoNs): void {
  if (LSP_FOLDING_KIND_MAP["comment"]) return;
  LSP_FOLDING_KIND_MAP["comment"] = monaco.languages.FoldingRangeKind.Comment;
  LSP_FOLDING_KIND_MAP["imports"] = monaco.languages.FoldingRangeKind.Imports;
  LSP_FOLDING_KIND_MAP["region"] = monaco.languages.FoldingRangeKind.Region;
}

export function toMonacoFoldingRanges(
  monaco: typeof monacoNs,
  ranges: LspFoldingRange[],
): monacoNs.languages.FoldingRange[] {
  initFoldingKindMap(monaco);

  return ranges.map((r) => ({
    start: r.startLine + 1,
    end: r.endLine + 1,
    kind: r.kind ? LSP_FOLDING_KIND_MAP[r.kind] : undefined,
  }));
}

// ── 7N — Selection Ranges ─────────────────────────────────────

export function flattenSelectionRange(
  sr: LspSelectionRange,
): monacoNs.languages.SelectionRange[] {
  const result: monacoNs.languages.SelectionRange[] = [];
  let current: LspSelectionRange | undefined = sr;

  while (current) {
    result.push({ range: toMonacoRange(current.range) });
    current = current.parent;
  }

  return result;
}

// ── 7O — Linked Editing Ranges ────────────────────────────────

export function toMonacoLinkedEditingRanges(
  result: LspLinkedEditingRanges,
): monacoNs.languages.LinkedEditingRanges {
  return {
    ranges: result.ranges.map(toMonacoRange),
    wordPattern: result.wordPattern ? new RegExp(result.wordPattern) : undefined,
  };
}

// ── 7P — Inlay Hints ─────────────────────────────────────────

export function toMonacoInlayHint(
  _monaco: typeof monacoNs,
  hint: LspInlayHint,
): monacoNs.languages.InlayHint {
  let label: string | monacoNs.languages.InlayHintLabelPart[];

  if (typeof hint.label === "string") {
    label = hint.label;
  } else {
    label = hint.label.map((part) => {
      const result: monacoNs.languages.InlayHintLabelPart = {
        label: part.value,
      };
      if (part.tooltip) {
        result.tooltip = typeof part.tooltip === "string"
          ? part.tooltip
          : { value: part.tooltip.value };
      }
      if (part.location) {
        result.location = {
          uri: monacoUri(part.location.uri),
          range: toMonacoRange(part.location.range),
        };
      }
      if (part.command) {
        result.command = toMonacoCommand(part.command);
      }
      return result;
    });
  }

  let tooltip: string | monacoNs.IMarkdownString | undefined;
  if (typeof hint.tooltip === "string") {
    tooltip = hint.tooltip;
  } else if (hint.tooltip) {
    tooltip = { value: hint.tooltip.value };
  }

  return {
    position: toMonacoPosition(hint.position),
    label,
    kind: hint.kind as monacoNs.languages.InlayHintKind | undefined,
    tooltip,
    textEdits: hint.textEdits?.map(toMonacoTextEdit),
    paddingLeft: hint.paddingLeft,
    paddingRight: hint.paddingRight,
  };
}

// ── 7Q — Semantic Tokens ──────────────────────────────────────

export function toMonacoSemanticTokens(
  tokens: LspSemanticTokens,
): monacoNs.languages.SemanticTokens {
  return {
    resultId: tokens.resultId,
    data: new Uint32Array(tokens.data),
  };
}

export function getSemanticTokensLegend(
  serverCaps: Record<string, unknown>,
): monacoNs.languages.SemanticTokensLegend | null {
  const tokensProvider = serverCaps["semanticTokensProvider"] as
    | { legend?: { tokenTypes?: string[]; tokenModifiers?: string[] } }
    | undefined;

  if (!tokensProvider?.legend) return null;

  return {
    tokenTypes: tokensProvider.legend.tokenTypes ?? [],
    tokenModifiers: tokensProvider.legend.tokenModifiers ?? [],
  };
}

// ── 7R — Document Highlights ──────────────────────────────────

export function toMonacoDocumentHighlights(
  highlights: LspDocumentHighlight[],
): monacoNs.languages.DocumentHighlight[] {
  return highlights.map((h) => ({
    range: toMonacoRange(h.range),
    kind: h.kind as monacoNs.languages.DocumentHighlightKind | undefined,
  }));
}

// ── 7S — Inline Completions ──────────────────────────────────

interface LspInlineCompletionItem {
  insertText: string;
  filterText?: string;
  range?: LspRange;
  command?: LspCommand;
}

interface LspInlineCompletionList {
  items: LspInlineCompletionItem[];
}

export function toMonacoInlineCompletions(
  _monaco: typeof monacoNs,
  result: LspInlineCompletionList | LspInlineCompletionItem[] | null,
): monacoNs.languages.InlineCompletions {
  if (!result) return { items: [] };

  const items = Array.isArray(result) ? result : result.items;

  return {
    items: items.map((item) => ({
      insertText: item.insertText,
      filterText: item.filterText,
      range: item.range ? toMonacoRange(item.range) : undefined,
      command: item.command ? toMonacoCommand(item.command) : undefined,
    })),
  };
}
