// ── Snippet parser — VS Code snippet JSON → Monaco CompletionItem ──
import type * as monacoNs from "monaco-editor";
import type { SnippetDefinition, VSCodeSnippetFile } from "./types";

/**
 * Parse a VS Code snippet file into SnippetDefinition array.
 */
export function parseVSCodeSnippets(
  json: VSCodeSnippetFile,
  source = "user",
): SnippetDefinition[] {
  const snippets: SnippetDefinition[] = [];
  for (const [name, entry] of Object.entries(json)) {
    const langs = entry.scope
      ? entry.scope.split(",").map((s) => s.trim())
      : undefined;
    snippets.push({
      name,
      prefix: entry.prefix,
      body: entry.body,
      description: entry.description,
      languages: langs,
      source,
    });
  }
  return snippets;
}

/**
 * Convert a SnippetDefinition into a Monaco CompletionItem.
 */
export function toCompletionItem(
  snippet: SnippetDefinition,
  range: monacoNs.IRange,
  monaco: typeof monacoNs,
): monacoNs.languages.CompletionItem {
  const bodyText = Array.isArray(snippet.body)
    ? snippet.body.join("\n")
    : snippet.body;

  const prefixes = Array.isArray(snippet.prefix) ? snippet.prefix : [snippet.prefix];

  return {
    label: {
      label: prefixes[0],
      description: snippet.name,
    },
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: bodyText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: snippet.description
      ? { value: snippet.description }
      : undefined,
    detail: `Snippet (${snippet.source ?? "unknown"})`,
    range,
  };
}
