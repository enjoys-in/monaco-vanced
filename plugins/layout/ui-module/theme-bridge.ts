// ── Theme Bridge ───────────────────────────────────────────
// CSS variable injection and theme-aware utilities.

import type { ThemeColors, ThemeInfo, ThemeKind } from "./types";

const CSS_VAR_PREFIX = "--vscode-";

export class ThemeBridge {
  private currentTheme: ThemeInfo | null = null;

  applyTheme(theme: ThemeInfo): void {
    this.currentTheme = theme;
    this.injectCSSVariables(theme.colors);
    this.applyThemeClass(theme.kind);
  }

  getTheme(): ThemeInfo | null {
    return this.currentTheme;
  }

  getCSSVariable(name: string): string {
    if (typeof document === "undefined") return "";
    const fullName = name.startsWith("--") ? name : `${CSS_VAR_PREFIX}${name}`;
    return getComputedStyle(document.documentElement).getPropertyValue(fullName).trim();
  }

  private injectCSSVariables(colors: ThemeColors): void {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    for (const [key, value] of Object.entries(colors)) {
      const cssVarName = `${CSS_VAR_PREFIX}${this.camelToKebab(key)}`;
      root.style.setProperty(cssVarName, value);
    }
  }

  private applyThemeClass(kind: ThemeKind): void {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("theme-dark", "theme-light", "theme-hc");
    root.classList.add(`theme-${kind}`);
  }

  private camelToKebab(str: string): string {
    return str.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
  }

  dispose(): void {
    this.currentTheme = null;
  }
}
