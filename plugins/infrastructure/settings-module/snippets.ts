// ── Settings Module — Snippets Registry ───────────────────────
// Manages per-language snippet files and registers them as
// Monaco completion providers. Supports VSCode snippet format:
// $1..$9, $0 (final cursor), ${1:placeholder}, ${1|opt1,opt2|},
// TM_FILENAME, TM_FILEPATH, CURRENT_DATE, etc.

import type { PluginContext, IDisposable } from "@core/types";
import type { SnippetFile } from "./types";

export class SnippetsRegistry {
  /** language → { "snippet name" → SnippetDefinition } */
  private readonly store = new Map<string, SnippetFile>();
  private readonly providerDisposables: IDisposable[] = [];

  /** Register snippets for a language (merges if already exists). */
  register(language: string, snippetFile: SnippetFile): void {
    const existing = this.store.get(language) ?? {};
    this.store.set(language, { ...existing, ...snippetFile });
  }

  /** Get all snippets for a language (includes "global"). */
  getForLanguage(language: string): SnippetFile {
    const global = this.store.get("global") ?? {};
    const langSpecific = this.store.get(language) ?? {};
    return { ...global, ...langSpecific };
  }

  /** Get all registered languages. */
  getLanguages(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * Mount completion providers for all tracked languages.
   * Called during onMount when ctx is available.
   */
  mountProviders(ctx: PluginContext): void {
    // Register a universal provider that checks per-language
    const { monaco } = ctx;
    const self = this;

    const disposable = monaco.languages.registerCompletionItemProvider("*", {
      provideCompletionItems(model, position) {
        const langId = model.getLanguageId();
        const allSnippets = self.getForLanguage(langId);
        if (!allSnippets || Object.keys(allSnippets).length === 0) return { suggestions: [] };

        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions = Object.entries(allSnippets).map(([name, snippet]) => ({
          label: snippet.prefix,
          kind: monaco.languages.CompletionItemKind.Snippet,
          documentation: snippet.description ?? name,
          insertText: Array.isArray(snippet.body) ? snippet.body.join("\n") : snippet.body,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        }));

        return { suggestions };
      },
    });

    this.providerDisposables.push(disposable);
  }

  dispose(): void {
    for (const d of this.providerDisposables) d.dispose();
    this.providerDisposables.length = 0;
    this.store.clear();
  }
}
