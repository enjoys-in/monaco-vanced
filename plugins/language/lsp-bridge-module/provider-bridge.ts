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

/**
 * The V1 provider bridge translates Monaco provider requests into JSON-RPC
 * calls. Uses generic ProviderFactory pattern — consumers define how to
 * map Monaco → RPC and RPC → Monaco.
 */
export class LspProviderBridge {
  private disposables: IDisposable[] = [];

  constructor(
    private rpcClient: CustomLspClient,
    private monaco: typeof monacoNs,
  ) {}

  /**
   * Register a single Monaco provider that proxies to an RPC method.
   */
  registerProvider(
    languageId: string,
    _method: string,
    providerFactory: ProviderFactory,
  ): IDisposable {
    const provider = providerFactory(this.rpcClient, this.monaco);

    // Determine which register method to use based on the provider's shape
    let disposable: IDisposable;

    if ("provideCompletionItems" in provider) {
      disposable = this.monaco.languages.registerCompletionItemProvider(
        languageId,
        provider as monacoNs.languages.CompletionItemProvider,
      );
    } else if ("provideHover" in provider) {
      disposable = this.monaco.languages.registerHoverProvider(
        languageId,
        provider as monacoNs.languages.HoverProvider,
      );
    } else if ("provideDefinition" in provider) {
      disposable = this.monaco.languages.registerDefinitionProvider(
        languageId,
        provider as monacoNs.languages.DefinitionProvider,
      );
    } else if ("provideReferences" in provider) {
      disposable = this.monaco.languages.registerReferenceProvider(
        languageId,
        provider as monacoNs.languages.ReferenceProvider,
      );
    } else if ("provideDocumentSymbols" in provider) {
      disposable = this.monaco.languages.registerDocumentSymbolProvider(
        languageId,
        provider as monacoNs.languages.DocumentSymbolProvider,
      );
    } else if ("provideSignatureHelp" in provider) {
      disposable = this.monaco.languages.registerSignatureHelpProvider(
        languageId,
        provider as monacoNs.languages.SignatureHelpProvider,
      );
    } else if ("provideCodeActions" in provider) {
      disposable = this.monaco.languages.registerCodeActionProvider(
        languageId,
        provider as monacoNs.languages.CodeActionProvider,
      );
    } else if ("provideCodeLenses" in provider) {
      disposable = this.monaco.languages.registerCodeLensProvider(
        languageId,
        provider as monacoNs.languages.CodeLensProvider,
      );
    } else if ("provideDocumentFormattingEdits" in provider) {
      disposable = this.monaco.languages.registerDocumentFormattingEditProvider(
        languageId,
        provider as monacoNs.languages.DocumentFormattingEditProvider,
      );
    } else if ("provideRenameEdits" in provider) {
      disposable = this.monaco.languages.registerRenameProvider(
        languageId,
        provider as monacoNs.languages.RenameProvider,
      );
    } else if ("provideFoldingRanges" in provider) {
      disposable = this.monaco.languages.registerFoldingRangeProvider(
        languageId,
        provider as monacoNs.languages.FoldingRangeProvider,
      );
    } else if ("provideInlayHints" in provider) {
      disposable = this.monaco.languages.registerInlayHintsProvider(
        languageId,
        provider as monacoNs.languages.InlayHintsProvider,
      );
    } else {
      return { dispose: () => {} };
    }

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
