/**
 * Context Engine Manifest — describes the structure of manifest.json
 * fetched from CDN: ${CONTEXT_CDN_BASE_URL}/@enjoys/context-engine/data/manifest.json
 *
 * Source: https://github.com/enjoys-in/context-engine/blob/main/data/manifest.json
 */

/** Provider names matching the 29 provider types in the context engine */
export type ContextProviderName =
  | "codeActions"
  | "codeLens"
  | "color"
  | "commands"
  | "completion"
  | "declaration"
  | "definition"
  | "documentHighlight"
  | "documentRangeFormatting"
  | "documentSymbol"
  | "foldingRange"
  | "formatting"
  | "hover"
  | "implementation"
  | "inlayHints"
  | "inlineCompletions"
  | "linkedEditingRange"
  | "links"
  | "monarchTokens"
  | "multiDocumentHighlight"
  | "newSymbolNames"
  | "onTypeFormatting"
  | "rangeSemanticTokens"
  | "references"
  | "rename"
  | "selectionRange"
  | "semanticTokens"
  | "signatureHelp"
  | "typeDefinition";

/** Per-language file mapping — keys are provider names, values are relative file paths */
export type LanguageFileMap = Partial<Record<ContextProviderName, string>>;

/** A language entry in the manifest */
export interface ManifestLanguageEntry {
  id: string;
  name: string;
  files: LanguageFileMap;
}

/** A provider entry in the manifest (top-level flat provider section) */
export interface ManifestProviderEntry {
  name: ContextProviderName;
  description: string;
  files: string[];
}

/** Theme map — key is theme slug, value is relative path to theme JSON */
export type ManifestThemeMap = Record<string, string>;

/** Root manifest.json structure */
export interface ContextEngineManifest {
  version: string;
  description: string;
  generatedAt: string;
  totalLanguages: number;
  totalProviders: number;
  totalFiles: number;
  totalThemes: number;
  themes: ManifestThemeMap;
  languages: ManifestLanguageEntry[];
  providers: ManifestProviderEntry[];
}
