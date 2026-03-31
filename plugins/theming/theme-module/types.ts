// ── Theme Module — Shared Types ──────────────────────────────

export interface ThemeTokenColor {
  scope: string | string[];
  settings: { foreground?: string; background?: string; fontStyle?: string };
}

export interface ThemeDefinition {
  id: string;
  name: string;
  type: "light" | "dark" | "hc";
  colors: Record<string, string>;
  tokenColors: ThemeTokenColor[];
  semanticTokenColors?: Record<string, string>;
}

export interface ThemeConfig {
  defaultTheme?: string;
  persistKey?: string;
}

export interface ThemeModuleAPI {
  apply(themeId: string): void;
  register(theme: ThemeDefinition): void;
  getThemes(): ThemeDefinition[];
  getCurrent(): string;
  onThemeChange(handler: (themeId: string) => void): void;
}
