// ── Prettier config loader — resolves .prettierrc / config from settings ──
import type { PrettierConfig } from "./types";

const CONFIG_FILENAMES = [
  ".prettierrc",
  ".prettierrc.json",
  ".prettierrc.yaml",
  ".prettierrc.yml",
  "prettier.config.js",
  "prettier.config.mjs",
  ".prettierrc.js",
  ".prettierrc.mjs",
];

/**
 * Merge user-provided config with defaults.
 * In the browser environment we can't read the filesystem for .prettierrc,
 * so the user passes config via plugin options or settings events.
 */
export function resolveConfig(
  userConfig?: PrettierConfig,
): PrettierConfig {
  return {
    printWidth: 80,
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: false,
    trailingComma: "all",
    bracketSpacing: true,
    bracketSameLine: false,
    arrowParens: "always",
    endOfLine: "lf",
    ...userConfig,
  };
}

/**
 * Try to parse a .prettierrc JSON string into a PrettierConfig.
 * Returns null on parse failure.
 */
export function parsePrettierRc(content: string): PrettierConfig | null {
  try {
    return JSON.parse(content) as PrettierConfig;
  } catch {
    return null;
  }
}

export { CONFIG_FILENAMES };