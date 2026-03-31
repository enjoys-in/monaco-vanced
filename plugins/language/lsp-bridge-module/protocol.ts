// ── LSP Bridge Module — V1 JSON-RPC 2.0 Method Map ────────────
// See context/lsp-bridge-module.txt Section 5B

/**
 * Standard LSP text document methods (29+ methods).
 * Used by V1 custom client for manual JSON-RPC framing.
 */
export const LSP_METHODS = {
  // ── Completion ──────────────────────────────────────────
  completion: "textDocument/completion",
  completionResolve: "completionItem/resolve",

  // ── Navigation ──────────────────────────────────────────
  hover: "textDocument/hover",
  definition: "textDocument/definition",
  declaration: "textDocument/declaration",
  typeDefinition: "textDocument/typeDefinition",
  implementation: "textDocument/implementation",
  references: "textDocument/references",

  // ── Symbols & Highlights ────────────────────────────────
  documentHighlight: "textDocument/documentHighlight",
  documentSymbol: "textDocument/documentSymbol",

  // ── Code Intelligence ───────────────────────────────────
  codeAction: "textDocument/codeAction",
  codeLens: "textDocument/codeLens",
  codeLensResolve: "codeLens/resolve",
  documentLink: "textDocument/documentLink",
  documentLinkResolve: "documentLink/resolve",
  signatureHelp: "textDocument/signatureHelp",

  // ── Formatting ──────────────────────────────────────────
  formatting: "textDocument/formatting",
  rangeFormatting: "textDocument/rangeFormatting",
  onTypeFormatting: "textDocument/onTypeFormatting",

  // ── Folding / Selection / Editing ───────────────────────
  foldingRange: "textDocument/foldingRange",
  selectionRange: "textDocument/selectionRange",
  linkedEditingRange: "textDocument/linkedEditingRange",

  // ── Inlay / Semantic ────────────────────────────────────
  inlayHint: "textDocument/inlayHint",
  inlayHintResolve: "inlayHint/resolve",
  semanticTokensFull: "textDocument/semanticTokens/full",
  semanticTokensRange: "textDocument/semanticTokens/range",

  // ── Color ───────────────────────────────────────────────
  documentColor: "textDocument/documentColor",
  colorPresentation: "textDocument/colorPresentation",

  // ── Rename ──────────────────────────────────────────────
  rename: "textDocument/rename",
  prepareRename: "textDocument/prepareRename",

  // ── Inline Completions ──────────────────────────────────
  inlineCompletion: "textDocument/inlineCompletion",

  // ── Document Sync (notifications) ───────────────────────
  didOpen: "textDocument/didOpen",
  didChange: "textDocument/didChange",
  didClose: "textDocument/didClose",
  didSave: "textDocument/didSave",

  // ── Server → Client notifications ──────────────────────
  publishDiagnostics: "textDocument/publishDiagnostics",
  showMessage: "window/showMessage",
  logMessage: "window/logMessage",

  // ── Lifecycle ───────────────────────────────────────────
  initialize: "initialize",
  initialized: "initialized",
  shutdown: "shutdown",
  exit: "exit",
} as const;

export type LspMethod = (typeof LSP_METHODS)[keyof typeof LSP_METHODS];
