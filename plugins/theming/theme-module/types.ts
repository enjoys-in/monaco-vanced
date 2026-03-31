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

/** Stored in IndexedDB via Dexie — theme index entry */
export interface ThemeIndexEntry {
  id: string;
  file: string;
}

/** Stored in IndexedDB via Dexie — cached full theme */
export interface CachedTheme {
  id: string;
  data: ThemeDefinition;
  fetchedAt: number;
}

export interface ThemeConfig {
  defaultTheme?: string;
  persistKey?: string;
  /** CDN base URL for theme JSON files */
  cdnBase?: string;
}

export interface ThemeModuleAPI {
  apply(themeId: string): Promise<void>;
  register(theme: ThemeDefinition): void;
  /** Register themes extracted from a VSIX extension package */
  registerFromVSIX(themes: ThemeDefinition[]): void;
  getThemes(): ThemeDefinition[];
  getCurrent(): string;
  /** Get the full theme index (available remote themes) */
  getIndex(): ThemeIndexEntry[];
  /** Fetch a remote theme by ID from CDN (loads + caches in IndexedDB) */
  loadRemoteTheme(themeId: string): Promise<ThemeDefinition>;
  /** Refresh the theme index from CDN (re-fetch _index.json) */
  refreshIndex(): Promise<ThemeIndexEntry[]>;
  onThemeChange(handler: (themeId: string) => void): void;
}
