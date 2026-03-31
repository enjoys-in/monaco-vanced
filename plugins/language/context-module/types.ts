// ── Context module types ─────────────────────────────────────
import type * as monacoNs from "monaco-editor";

// ── The 25 provider type keys (maps 1:1 to CDN data files) ──

export const PROVIDER_TYPES = [
  "completion",
  "hover",
  "definition",
  "declaration",
  "typeDefinition",
  "implementation",
  "references",
  "documentHighlight",
  "documentSymbol",
  "codeActions",
  "links",
  "signatureHelp",
  "foldingRange",
  "inlayHints",
  "codeLens",
  "color",
  "rename",
  "selectionRange",
  "linkedEditingRange",
  "formatting",
  "documentRangeFormatting",
  "onTypeFormatting",
  "semanticTokens",
  "rangeSemanticTokens",
  "inlineCompletions",
] as const;

export type ProviderType = (typeof PROVIDER_TYPES)[number];

// ── CDN manifest ─────────────────────────────────────────────

export interface ManifestLanguage {
  id: string;
  name: string;
  files: Record<ProviderType, string>;
}

export interface LanguageManifest {
  version: string;
  languages: ManifestLanguage[];
}

// ── Plugin options ───────────────────────────────────────────

export interface ContextModuleOptions {
  /** CDN base URL (default: https://cdn.jsdelivr.net/npm/@enjoys/context-engine) */
  cdnBase?: string;
  /** Language IDs to auto-register on mount. If omitted, registers all available. */
  languages?: string[];
  /** Provider types to register. If omitted, registers all 25. */
  providerTypes?: ProviderType[];
}

// ── Provider registration map ────────────────────────────────

export type ProviderRegistrar = (
  monaco: typeof monacoNs,
  languageId: string,
  data: unknown,
) => monacoNs.IDisposable | monacoNs.IDisposable[] | null;