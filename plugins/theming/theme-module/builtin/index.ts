// ── Built-in theme definitions ───────────────────────────────
// Import once here; consumers use these variables instead of raw JSON.

import type { ThemeDefinition } from "../types";

import _dracula from "./dracula.json";
import _githubDark from "./github-dark.json";
import _githubLight from "./github-light.json";
import _monokai from "./monokai.json";
import _oneDark from "./one-dark.json";

export const draculaTheme = _dracula as unknown as ThemeDefinition;
export const githubDarkTheme = _githubDark as unknown as ThemeDefinition;
export const githubLightTheme = _githubLight as unknown as ThemeDefinition;
export const monokaiTheme = _monokai as unknown as ThemeDefinition;
export const oneDarkTheme = _oneDark as unknown as ThemeDefinition;

/** All built-in themes as an array */
export const builtinThemes: ThemeDefinition[] = [
  draculaTheme,
  githubDarkTheme,
  githubLightTheme,
  monokaiTheme,
  oneDarkTheme,
];
