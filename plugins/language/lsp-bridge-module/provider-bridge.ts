// ── LSP Bridge Module — V1 Provider Bridge ────────────────────
// See context/lsp-bridge-module.txt Section 5C

import type * as monacoNs from "monaco-editor";
import type { IDisposable } from "@core/types";
import type { CustomLspClient } from "./v1-custom-client";

type ProviderFactory = (
  rpcClient: CustomLspClient,
  monaco: typeof monacoNs,
) => monacoNs.languages.CompletionItemProvider
  | monacoNs.languages.HoverProvider
  | monacoNs.languages.DefinitionProvider
  | monacoNs.languages.DeclarationProvider
  | monacoNs.languages.TypeDefinitionProvider
  | monacoNs.languages.ImplementationProvider
  | monacoNs.languages.ReferenceProvider
  | monacoNs.languages.DocumentSymbolProvider
  | monacoNs.languages.DocumentHighlightProvider
  | monacoNs.languages.SignatureHelpProvider
  | monacoNs.languages.CodeActionProvider
  | monacoNs.languages.CodeLensProvider
  | monacoNs.languages.LinkProvider
  | monacoNs.languages.DocumentColorProvider
  | monacoNs.languages.DocumentFormattingEditProvider
  | monacoNs.languages.DocumentRangeFormattingEditProvider
  | monacoNs.languages.OnTypeFormattingEditProvider
  | monacoNs.languages.RenameProvider
  | monacoNs.languages.NewSymbolNamesProvider
  | monacoNs.languages.FoldingRangeProvider
  | monacoNs.languages.SelectionRangeProvider
  | monacoNs.languages.LinkedEditingRangeProvider
  | monacoNs.languages.InlayHintsProvider
  | monacoNs.languages.DocumentSemanticTokensProvider
  | monacoNs.languages.DocumentRangeSemanticTokensProvider
  | monacoNs.languages.InlineCompletionsProvider;

/** Strongly-typed provider key → shape discriminator */
type ProviderKey =
  | "completion"
  | "hover"
  | "definition"
  | "declaration"
  | "typeDefinition"
  | "implementation"
  | "references"
  | "documentHighlight"
  | "documentSymbol"
  | "signatureHelp"
  | "codeAction"
  | "codeLens"
  | "links"
  | "color"
  | "formatting"
  | "rangeFormatting"
  | "onTypeFormatting"
  | "rename"
  | "newSymbolNames"
  | "foldingRange"
  | "selectionRange"
  | "linkedEditingRange"
  | "inlayHints"
  | "semanticTokens"
  | "rangeSemanticTokens"
  | "inlineCompletions";

/** Maps provider key to its discriminant property and register function name */
const PROVIDER_REGISTRY: Record<
  ProviderKey,
  { check: string; register: keyof typeof monacoNs.languages }
> = {
  completion:          { check: "provideCompletionItems",               register: "registerCompletionItemProvider" },
  hover:               { check: "provideHover",                         register: "registerHoverProvider" },
  definition:          { check: "provideDefinition",                    register: "registerDefinitionProvider" },
  declaration:         { check: "provideDeclaration",                   register: "registerDeclarationProvider" },
  typeDefinition:      { check: "provideTypeDefinition",                register: "registerTypeDefinitionProvider" },
  implementation:      { check: "provideImplementation",                register: "registerImplementationProvider" },
  references:          { check: "provideReferences",                    register: "registerReferenceProvider" },
  documentHighlight:   { check: "provideDocumentHighlights",            register: "registerDocumentHighlightProvider" },
  documentSymbol:      { check: "provideDocumentSymbols",               register: "registerDocumentSymbolProvider" },
  signatureHelp:       { check: "provideSignatureHelp",                 register: "registerSignatureHelpProvider" },
  codeAction:          { check: "provideCodeActions",                   register: "registerCodeActionProvider" },
  codeLens:            { check: "provideCodeLenses",                    register: "registerCodeLensProvider" },
  links:               { check: "provideLinks",                         register: "registerLinkProvider" },
  color:               { check: "provideDocumentColors",                register: "registerColorProvider" },
  formatting:          { check: "provideDocumentFormattingEdits",       register: "registerDocumentFormattingEditProvider" },
  rangeFormatting:     { check: "provideDocumentRangeFormattingEdits",  register: "registerDocumentRangeFormattingEditProvider" },
  onTypeFormatting:    { check: "provideOnTypeFormattingEdits",         register: "registerOnTypeFormattingEditProvider" },
  rename:              { check: "provideRenameEdits",                   register: "registerRenameProvider" },
  newSymbolNames:      { check: "provideNewSymbolNames",                register: "registerNewSymbolNameProvider" },
  foldingRange:        { check: "provideFoldingRanges",                 register: "registerFoldingRangeProvider" },
  selectionRange:      { check: "provideSelectionRanges",               register: "registerSelectionRangeProvider" },
  linkedEditingRange:  { check: "provideLinkedEditingRanges",           register: "registerLinkedEditingRangeProvider" },
  inlayHints:          { check: "provideInlayHints",                    register: "registerInlayHintsProvider" },
  semanticTokens:      { check: "provideDocumentSemanticTokens",        register: "registerDocumentSemanticTokensProvider" },
  rangeSemanticTokens: { check: "provideDocumentRangeSemanticTokens",   register: "registerDocumentRangeSemanticTokensProvider" },
  inlineCompletions:   { check: "provideInlineCompletions",             register: "registerInlineCompletionsProvider" },
};

/**
 * The V1 provider bridge translates Monaco provider requests into JSON-RPC
 * calls. Uses strongly-typed PROVIDER_REGISTRY — consumers define how to
 * map Monaco → RPC and RPC → Monaco via ProviderFactory.
 */
export class LspProviderBridge {
  private disposables: IDisposable[] = [];

  constructor(
    private rpcClient: CustomLspClient,
    private monaco: typeof monacoNs,
  ) {}

  /**
   * Register a single Monaco provider that proxies to an RPC method.
   * Auto-detects provider type via shape checking against PROVIDER_REGISTRY.
   */
  registerProvider(
    languageId: string,
    _method: string,
    providerFactory: ProviderFactory,
  ): IDisposable {
    const provider = providerFactory(this.rpcClient, this.monaco);

    for (const entry of Object.values(PROVIDER_REGISTRY)) {
      if (entry.check in provider) {
        const registerFn = this.monaco.languages[entry.register] as (
          languageId: string,
          provider: never,
        ) => IDisposable;
        const disposable = registerFn(languageId, provider as never);
        this.disposables.push(disposable);
        return disposable;
      }
    }

    return { dispose: () => {} };
  }

  /**
   * Register a provider by explicit key — no shape detection needed.
   */
  registerByKey(
    languageId: string,
    key: ProviderKey,
    providerFactory: ProviderFactory,
  ): IDisposable {
    const provider = providerFactory(this.rpcClient, this.monaco);
    const entry = PROVIDER_REGISTRY[key];
    const registerFn = this.monaco.languages[entry.register] as (
      languageId: string,
      provider: never,
    ) => IDisposable;
    const disposable = registerFn(languageId, provider as never);
    this.disposables.push(disposable);
    return disposable;
  }

  /**
   * Batch-register providers given a list of (method, factory) pairs.
   */
  registerAllProviders(
    languageId: string,
    entries: Array<{ method: string; factory: ProviderFactory }>,
  ): IDisposable[] {
    return entries.map(({ method, factory }) =>
      this.registerProvider(languageId, method, factory),
    );
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.disposables.length = 0;
  }
}
