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
  | monacoNs.languages.ReferenceProvider
  | monacoNs.languages.DocumentSymbolProvider
  | monacoNs.languages.SignatureHelpProvider
  | monacoNs.languages.CodeActionProvider
  | monacoNs.languages.CodeLensProvider
  | monacoNs.languages.DocumentFormattingEditProvider
  | monacoNs.languages.RenameProvider
  | monacoNs.languages.FoldingRangeProvider
  | monacoNs.languages.InlayHintsProvider;

/** Strongly-typed provider key → shape discriminator */
type ProviderKey =
  | "completion"
  | "hover"
  | "definition"
  | "references"
  | "documentSymbol"
  | "signatureHelp"
  | "codeAction"
  | "codeLens"
  | "formatting"
  | "rename"
  | "foldingRange"
  | "inlayHints";

/** Maps provider key to its discriminant property and register function name */
const PROVIDER_REGISTRY: Record<
  ProviderKey,
  { check: string; register: keyof typeof monacoNs.languages }
> = {
  completion:     { check: "provideCompletionItems",          register: "registerCompletionItemProvider" },
  hover:          { check: "provideHover",                    register: "registerHoverProvider" },
  definition:     { check: "provideDefinition",               register: "registerDefinitionProvider" },
  references:     { check: "provideReferences",               register: "registerReferenceProvider" },
  documentSymbol: { check: "provideDocumentSymbols",          register: "registerDocumentSymbolProvider" },
  signatureHelp:  { check: "provideSignatureHelp",            register: "registerSignatureHelpProvider" },
  codeAction:     { check: "provideCodeActions",              register: "registerCodeActionProvider" },
  codeLens:       { check: "provideCodeLenses",               register: "registerCodeLensProvider" },
  formatting:     { check: "provideDocumentFormattingEdits",  register: "registerDocumentFormattingEditProvider" },
  rename:         { check: "provideRenameEdits",              register: "registerRenameProvider" },
  foldingRange:   { check: "provideFoldingRanges",            register: "registerFoldingRangeProvider" },
  inlayHints:     { check: "provideInlayHints",               register: "registerInlayHintsProvider" },
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
