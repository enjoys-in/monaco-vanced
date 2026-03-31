// ── ESLint config loader — resolves .eslintrc / config from settings ──
import type { ESLintConfig } from "./types";

const CONFIG_FILENAMES = [
  ".eslintrc",
  ".eslintrc.json",
  ".eslintrc.js",
  ".eslintrc.cjs",
  ".eslintrc.mjs",
  ".eslintrc.yaml",
  ".eslintrc.yml",
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
];

/** Default ESLint config for browser-based linting */
const DEFAULTS: ESLintConfig = {
  env: { browser: true, es2024: true },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  rules: {
    "no-unused-vars": "warn",
    "no-undef": "error",
    "no-console": "off",
    "no-debugger": "warn",
    "no-duplicate-case": "error",
    "no-empty": "warn",
    eqeqeq: "warn",
    "no-redeclare": "error",
  },
};

/**
 * Merge user config with defaults.
 */
export function resolveConfig(userConfig?: ESLintConfig): ESLintConfig {
  return {
    ...DEFAULTS,
    ...userConfig,
    rules: { ...DEFAULTS.rules, ...userConfig?.rules },
    env: { ...DEFAULTS.env, ...userConfig?.env },
  };
}

/**
 * Parse an .eslintrc JSON string.
 */
export function parseEslintRc(content: string): ESLintConfig | null {
  try {
    return JSON.parse(content) as ESLintConfig;
  } catch {
    return null;
  }
}

export { CONFIG_FILENAMES };