// ── Prettier formatter — loads standalone Prettier in browser ──
import type { PrettierConfig } from "./types";
import { LANGUAGE_PARSER_MAP, DEFAULT_CDN_BASE } from "./types";

/**
 * Dynamically imports standalone Prettier from CDN and formats code.
 * Prettier standalone works in the browser without Node.js.
 *
 * @param code - The source code to format
 * @param languageId - Monaco language ID (used to resolve parser)
 * @param config - Prettier config options
 * @param prettierUrl - Override URL for the standalone Prettier bundle
 * @param parserUrls - Override URLs for parser plugins
 */
export async function formatWithPrettier(
  code: string,
  languageId: string,
  config: PrettierConfig,
  prettierUrl?: string,
  parserUrls?: Record<string, string>,
): Promise<string> {
  const parser = LANGUAGE_PARSER_MAP[languageId];
  if (!parser) {
    throw new Error(`[prettier-module] No parser mapping for language: ${languageId}`);
  }

  const baseUrl = prettierUrl ?? DEFAULT_CDN_BASE;

  // Resolve parser plugin URL
  const parserPluginUrl = parserUrls?.[parser] ?? resolveParserUrl(baseUrl, parser);

  // Dynamic import of Prettier standalone + parser plugin
  const [prettier, parserPlugin] = await Promise.all([
    importModule(`${baseUrl}.mjs`),
    importModule(parserPluginUrl),
  ]);

  if (!prettier?.format) {
    throw new Error("[prettier-module] Failed to load Prettier standalone");
  }

  const formatFn = prettier.format as (
    code: string,
    options: Record<string, unknown>,
  ) => Promise<string>;

  const formatted = await formatFn(code, {
    ...config,
    parser,
    plugins: [parserPlugin],
  });

  return formatted;
}

/**
 * Check if a language is supported by the formatter.
 */
export function isLanguageSupported(languageId: string): boolean {
  return languageId in LANGUAGE_PARSER_MAP;
}

// ── Internals ────────────────────────────────────────────────

function resolveParserUrl(baseUrl: string, parser: string): string {
  // Map parser names to CDN plugin file names
  const parserFileMap: Record<string, string> = {
    babel: "plugins/babel.mjs",
    typescript: "plugins/typescript.mjs",
    json: "plugins/babel.mjs",
    html: "plugins/html.mjs",
    css: "plugins/postcss.mjs",
    markdown: "plugins/markdown.mjs",
    yaml: "plugins/yaml.mjs",
    graphql: "plugins/graphql.mjs",
  };

  const file = parserFileMap[parser] ?? `plugins/${parser}.mjs`;
  // baseUrl is like https://cdn.jsdelivr.net/npm/prettier@3/standalone
  // Plugin path: https://cdn.jsdelivr.net/npm/prettier@3/plugins/babel.mjs
  const base = baseUrl.replace(/\/standalone$/, "");
  return `${base}/${file}`;
}

/** Dynamic import wrapper with cache-busting */
async function importModule(url: string): Promise<Record<string, unknown>> {
  // Use dynamic import for ESM modules from CDN
  return import(/* @vite-ignore */ url);
}