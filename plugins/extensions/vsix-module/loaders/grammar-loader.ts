// ── VSIX Module — Grammar Loader ─────────────────────────────

import type { VSIXPackage, VSIXManifest } from "../types";
import { convertTextmateToMonarch } from "../converters/textmate-to-monarch";

/**
 * Load grammars from a VSIX package and register them as Monarch tokenizers.
 * Returns the list of registered language IDs.
 */
export function loadGrammars(
  pkg: VSIXPackage,
  manifest: VSIXManifest,
  monaco: {
    languages: {
      register(language: { id: string }): void;
      setMonarchTokensProvider(languageId: string, rules: unknown): void;
    };
  },
): string[] {
  const registered: string[] = [];
  const grammars = manifest.contributes.grammars;
  if (!grammars) return registered;

  const decoder = new TextDecoder();

  for (const grammar of grammars) {
    const fileKey = findFileKey(pkg.files, grammar.path);
    if (!fileKey) {
      console.warn(`[vsix-grammar-loader] grammar file not found: ${grammar.path}`);
      continue;
    }

    try {
      const jsonText = decoder.decode(pkg.files.get(fileKey)!);
      const tmGrammar = JSON.parse(jsonText);
      const monarchDef = convertTextmateToMonarch(tmGrammar);

      // Register language if not already registered
      monaco.languages.register({ id: grammar.language });
      monaco.languages.setMonarchTokensProvider(grammar.language, monarchDef);
      registered.push(grammar.language);
    } catch (err) {
      console.warn(`[vsix-grammar-loader] failed to load grammar for "${grammar.language}":`, err);
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
