// ── VSIX Module — Snippet Loader ─────────────────────────────

import type { VSIXPackage, VSIXManifest } from "../types";

interface VSCodeSnippet {
  prefix: string | string[];
  body: string | string[];
  description?: string;
}

/**
 * Load snippets from a VSIX package and register them as completion items.
 * Returns the list of language IDs with registered snippets.
 */
export function loadSnippets(
  pkg: VSIXPackage,
  manifest: VSIXManifest,
  monaco: {
    languages: {
      registerCompletionItemProvider(
        languageId: string,
        provider: unknown,
      ): { dispose(): void };
    };
  },
): string[] {
  const registered: string[] = [];
  const snippets = manifest.contributes.snippets;
  if (!snippets) return registered;

  const decoder = new TextDecoder();

  for (const snippetContrib of snippets) {
    const fileKey = findFileKey(pkg.files, snippetContrib.path);
    if (!fileKey) {
      console.warn(`[vsix-snippet-loader] snippet file not found: ${snippetContrib.path}`);
      continue;
    }

    try {
      const jsonText = decoder.decode(pkg.files.get(fileKey)!);
      const snippetDefs = JSON.parse(jsonText) as Record<string, VSCodeSnippet>;
      const items = Object.entries(snippetDefs).map(([name, def]) => ({
        label: Array.isArray(def.prefix) ? def.prefix[0] : def.prefix,
        insertText: Array.isArray(def.body) ? def.body.join("\n") : def.body,
        documentation: def.description ?? name,
        kind: 27, // monaco.languages.CompletionItemKind.Snippet
        insertTextRules: 4, // InsertAsSnippet
      }));

      monaco.languages.registerCompletionItemProvider(snippetContrib.language, {
        provideCompletionItems: () => ({ suggestions: items }),
      });
      registered.push(snippetContrib.language);
    } catch (err) {
      console.warn(`[vsix-snippet-loader] failed to load snippets for "${snippetContrib.language}":`, err);
    }
  }

  return registered;
}

function findFileKey(files: Map<string, Uint8Array>, path: string): string | undefined {
  for (const key of files.keys()) {
    if (key === path || key.endsWith(`/${path}`) || key.endsWith(path.replace(/^\.\//, ""))) {
      return key;
    }
  }
  return undefined;
}
