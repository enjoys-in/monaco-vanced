// ── CSS Custom Properties bridge for live theme switching ────
//
// Sets --vsc-* CSS custom properties on :root so ALL wireframe
// DOM (including inline styles using var()) auto-updates on
// theme change.

import type { ThemeTokens } from "./ThemeProvider";
import { THEME_MAP, THEME_DEFS, DEFAULT_TOKENS } from "./ThemeProvider";

const PREFIX = "--vsc";

/** Module-level active theme cache — stays in sync across all mount points */
let _activeThemeName = "Dracula";
let _activeTokens: ThemeTokens | null = null;

export function setActiveTheme(name: string, tokens: ThemeTokens): void {
  _activeThemeName = name;
  _activeTokens = tokens;
}

export function getActiveTheme(): { name: string; tokens: ThemeTokens } {
  return { name: _activeThemeName, tokens: _activeTokens ?? DEFAULT_TOKENS };
}

/** Apply theme tokens as CSS custom properties on :root */
export function applyThemeVars(tokens: ThemeTokens): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(`${PREFIX}-${camelToDash(key)}`, value);
  }
}

/** Initialize default dark theme CSS variables (fallback until plugin loads) */
export function initThemeVars(): void {
  const defaultTheme = THEME_MAP["Dracula"] ?? DEFAULT_TOKENS;
  applyThemeVars(defaultTheme);
}

/** Resolve a theme by name and apply its CSS vars */
export function switchTheme(name: string): ThemeTokens | undefined {
  const tokens = THEME_MAP[name];
  if (tokens) {
    applyThemeVars(tokens);
    const def = THEME_DEFS[name];
    setActiveTheme(def?.name ?? name, tokens);
  }
  return tokens;
}

/** CSS var reference helper — returns `var(--vsc-camelKey)` */
export function v(key: keyof ThemeTokens): string {
  return `var(${PREFIX}-${camelToDash(key)})`;
}

// ── Build a CSS-var based C replacement ──────────────────────
// Returns an object where every key maps to `var(--vsc-<key>)`

type CSSVarColors = Record<keyof ThemeTokens, string>;

function buildCssVarC(): CSSVarColors {
  const keys: (keyof ThemeTokens)[] = [
    "bg", "editorBg", "sidebarBg", "activityBg", "titleBg", "menuBg",
    "tabBg", "tabActiveBg", "tabInactiveBg", "statusBg", "statusFg",
    "border", "borderLight", "fg", "fgDim", "fgBright",
    "accent", "accentAlt", "hover", "listHover", "listActive",
    "activeIcon", "inactiveIcon", "breadcrumbFg",
    "panelBg", "panelHeaderBg", "badgeBg", "badgeFg",
    "buttonBg", "buttonHoverBg", "inputBg", "inputBorder", "focusBorder",
    "cardBg", "cardBorder", "successGreen", "warningYellow", "errorRed",
    "textLink", "separator",
  ];
  const result = {} as CSSVarColors;
  for (const k of keys) {
    result[k] = `var(${PREFIX}-${camelToDash(k)})`;
  }
  return result;
}

export const CV = buildCssVarC();

// ── Helper ───────────────────────────────────────────────────
function camelToDash(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
