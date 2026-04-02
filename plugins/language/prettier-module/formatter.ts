// ── Prettier formatter — lazy-loads standalone Prettier & parser plugins ──
import type { PrettierConfig } from "./types";
import { LANGUAGE_PARSER_MAP, DEFAULT_CDN_BASE } from "./types";

// ── Module cache — Prettier core + each parser plugin loaded once ────

let prettierCore: Record<string, unknown> | null = null;
const parserCache = new Map<string, Record<string, unknown>>();

/**
 * Lazy-load the standalone Prettier core from CDN.
 * Cached after first load — subsequent calls return instantly.
 */
async function loadPrettierCore(baseUrl: string): Promise<Record<string, unknown>> {
  if (prettierCore) return prettierCore;
  prettierCore = await importModule(`${baseUrl}.mjs`);
  if (!prettierCore?.format) {
    prettierCore = null;
    throw new Error("[prettier-module] Failed to load Prettier standalone");
  }
  return prettierCore;
}

/**
 * Lazy-load a parser plugin from CDN.
 * Each parser (babel, typescript, html, etc.) is loaded once on first use
 * and cached for all subsequent format calls.
 */
async function loadParserPlugin(
  parser: string,
  baseUrl: string,
  parserUrls?: Record<string, string>,
): Promise<Record<string, unknown>> {
  const cached = parserCache.get(parser);
  if (cached) return cached;

  const url = parserUrls?.[parser] ?? resolveParserUrl(baseUrl, parser);
  const mod = await importModule(url);
  parserCache.set(parser, mod);
  return mod;
}

/**
 * Format code using standalone Prettier.
 * Both Prettier core and parser plugins are lazy-loaded on first call
 * per parser type. After initial load, formatting is near-instant.
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

  // Lazy-load core + parser (and estree if needed) in parallel
  const loads: Promise<unknown>[] = [
    loadPrettierCore(baseUrl),
    loadParserPlugin(parser, baseUrl, parserUrls),
  ];
  if (parserNeedsEstree(parser)) {
    loads.push(loadParserPlugin("estree", baseUrl, parserUrls));
  }

  const results = await Promise.all(loads);
  const prettier = results[0] as Record<string, unknown>;
  const parserPlugin = results[1] as Record<string, unknown>;
  const plugins: Record<string, unknown>[] = [parserPlugin];
  if (results[2]) plugins.push(results[2] as Record<string, unknown>);

  const formatFn = prettier.format as (
    code: string,
    options: Record<string, unknown>,
  ) => Promise<string>;

  return formatFn(code, {
    ...config,
    parser,
    plugins,
  });
}

/**
 * Pre-load a parser plugin for a specific language.
 * Call this when a file is opened to warm the cache before the user
 * triggers format. Returns silently if load fails.
 */
export async function preloadParserForLanguage(
  languageId: string,
  prettierUrl?: string,
  parserUrls?: Record<string, string>,
): Promise<void> {
  const parser = LANGUAGE_PARSER_MAP[languageId];
  if (!parser) return;
  const baseUrl = prettierUrl ?? DEFAULT_CDN_BASE;
  try {
    const loads: Promise<unknown>[] = [
      loadPrettierCore(baseUrl),
      loadParserPlugin(parser, baseUrl, parserUrls),
    ];
    if (parserNeedsEstree(parser)) {
      loads.push(loadParserPlugin("estree", baseUrl, parserUrls));
    }
    await Promise.all(loads);
  } catch {
    // Silently fail — will retry on actual format
  }
}

/**
 * Check if a language is supported by the formatter.
 */
export function isLanguageSupported(languageId: string): boolean {
  return languageId in LANGUAGE_PARSER_MAP;
}

/**
 * Clear the module cache. Useful for testing or forced reload.
 */
export function clearCache(): void {
  prettierCore = null;
  parserCache.clear();
}

// ── Internals ────────────────────────────────────────────────

/** Parsers that require the estree plugin alongside their own plugin */
const ESTREE_PARSERS = new Set(["babel", "typescript", "json"]);

function resolveParserUrl(baseUrl: string, parser: string): string {
  const parserFileMap: Record<string, string> = {
    babel: "plugins/babel.mjs",
    typescript: "plugins/typescript.mjs",
    json: "plugins/babel.mjs",
    html: "plugins/html.mjs",
    css: "plugins/postcss.mjs",
    markdown: "plugins/markdown.mjs",
    yaml: "plugins/yaml.mjs",
    graphql: "plugins/graphql.mjs",
    estree: "plugins/estree.mjs",
  };

  const file = parserFileMap[parser] ?? `plugins/${parser}.mjs`;
  const base = baseUrl.replace(/\/standalone$/, "");
  return `${base}/${file}`;
}

function parserNeedsEstree(parser: string): boolean {
  return ESTREE_PARSERS.has(parser);
}

async function importModule(url: string): Promise<Record<string, unknown>> {
  return import(/* @vite-ignore */ url);
}