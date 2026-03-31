// ── VSIX Module — Language Loader ────────────────────────────

import type { VSIXPackage, VSIXManifest } from "../types";

/**
 * Load language configurations from a VSIX package.
 * Returns the list of registered language IDs.
 */
export function loadLanguages(
  pkg: VSIXPackage,
  manifest: VSIXManifest,
  monaco: {
    languages: {
      register(language: {
        id: string;
        aliases?: string[];
        extensions?: string[];
        mimetypes?: string[];
      }): void;
      setLanguageConfiguration(languageId: string, config: unknown): void;
    };
  },
): string[] {
  const registered: string[] = [];
  const languages = manifest.contributes.languages;
  if (!languages) return registered;

  const decoder = new TextDecoder();

  for (const lang of languages) {
    try {
      // Register language metadata
      monaco.languages.register({
        id: lang.id,
        aliases: lang.aliases,
        extensions: lang.extensions,
        mimetypes: lang.mimetypes,
      });

      // Load language configuration file if provided
      if (lang.configuration) {
        const fileKey = findFileKey(pkg.files, lang.configuration);
        if (fileKey) {
          const jsonText = decoder.decode(pkg.files.get(fileKey)!);
          const config = JSON.parse(jsonText);
          const monacoConfig = convertLanguageConfig(config);
          monaco.languages.setLanguageConfiguration(lang.id, monacoConfig);
        }
      }

      registered.push(lang.id);
    } catch (err) {
      console.warn(`[vsix-language-loader] failed to load language "${lang.id}":`, err);
    }
  }

  return registered;
}

function convertLanguageConfig(config: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (config.comments) {
    result.comments = config.comments;
  }
  if (config.brackets) {
    result.brackets = config.brackets;
  }
  if (config.autoClosingPairs) {
    result.autoClosingPairs = config.autoClosingPairs;
  }
  if (config.surroundingPairs) {
    result.surroundingPairs = config.surroundingPairs;
  }
  if (config.folding) {
    result.folding = config.folding;
  }
  if (config.wordPattern) {
    result.wordPattern = new RegExp(config.wordPattern as string);
  }
  if (config.indentationRules) {
    const rules = config.indentationRules as Record<string, string>;
    result.indentationRules = {
      increaseIndentPattern: rules.increaseIndentPattern
        ? new RegExp(rules.increaseIndentPattern)
        : undefined,
      decreaseIndentPattern: rules.decreaseIndentPattern
        ? new RegExp(rules.decreaseIndentPattern)
        : undefined,
    };
  }

  return result;
}

function findFileKey(files: Map<string, Uint8Array>, path: string): string | undefined {
  for (const key of files.keys()) {
    if (key === path || key.endsWith(`/${path}`) || key.endsWith(path.replace(/^\.\//, ""))) {
      return key;
    }
  }
  return undefined;
}
