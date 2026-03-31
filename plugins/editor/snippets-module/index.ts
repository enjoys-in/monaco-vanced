// ── Snippets plugin — registers Monaco completion provider for snippets ──
import type * as monacoNs from "monaco-editor";
import type { MonacoPlugin, PluginContext } from "../../../core/types";
import type { SnippetConfig, SnippetDefinition, VSCodeSnippetFile } from "./types";
import { parseVSCodeSnippets, toCompletionItem } from "./parser";

export function createSnippetsPlugin(config?: SnippetConfig): MonacoPlugin {
  const snippets: SnippetDefinition[] = [];
  const disposables: monacoNs.IDisposable[] = [];

  return {
    id: "snippets-module",
    name: "Snippets Module",
    version: "1.0.0",
    description: "Registers snippet completions from VS Code JSON format",
    priority: 40,
    defaultEnabled: config?.enabled !== false,

    onMount(ctx: PluginContext) {
      const { monaco } = ctx;

      /** Register a completion provider for a language that provides snippets */
      const registerForLanguage = (languageId: string) => {
        const disposable = monaco.languages.registerCompletionItemProvider(languageId, {
          provideCompletionItems(
            model: monacoNs.editor.ITextModel,
            position: monacoNs.Position,
          ) {
            const word = model.getWordUntilPosition(position);
            const range: monacoNs.IRange = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };

            const matching = snippets.filter(
              (s) => !s.languages || s.languages.length === 0 || s.languages.includes(languageId),
            );

            let items = matching.map((s) => toCompletionItem(s, range, monaco));

            if (config?.deduplicateByPrefix) {
              const seen = new Set<string>();
              items = items.filter((item) => {
                const label = typeof item.label === "string" ? item.label : item.label.label;
                if (seen.has(label)) return false;
                seen.add(label);
                return true;
              });
            }

            return { suggestions: items };
          },
        });
        disposables.push(disposable);
      };

      // Wire event-driven API
      ctx.on("snippets:add", (payload) => {
        const snippet = payload as SnippetDefinition;
        snippets.push(snippet);
      });

      ctx.on("snippets:load-vscode", (payload) => {
        const { json, source } = payload as { json: VSCodeSnippetFile; source?: string };
        const parsed = parseVSCodeSnippets(json, source);
        snippets.push(...parsed);
      });

      // Register for all currently known languages
      const languages = monaco.languages.getLanguages();
      for (const lang of languages) {
        registerForLanguage(lang.id);
      }
    },

    onDispose() {
      for (const d of disposables) d.dispose();
      disposables.length = 0;
      snippets.length = 0;
    },
  };
}

export { parseVSCodeSnippets, toCompletionItem } from "./parser";
export type { SnippetDefinition, SnippetConfig, VSCodeSnippetFile } from "./types";
