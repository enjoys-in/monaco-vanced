// ── VSIX Module — Shared Types ───────────────────────────────

export interface VSIXContributes {
  themes?: VSIXThemeContribution[];
  grammars?: VSIXGrammarContribution[];
  icons?: VSIXIconContribution[];
  snippets?: VSIXSnippetContribution[];
  commands?: VSIXCommandContribution[];
  keybindings?: VSIXKeybindingContribution[];
  languages?: VSIXLanguageContribution[];
}

export interface VSIXThemeContribution {
  label: string;
  uiTheme: string;
  path: string;
}

export interface VSIXGrammarContribution {
  language: string;
  scopeName: string;
  path: string;
}

export interface VSIXIconContribution {
  id: string;
  label?: string;
  path: string;
}

export interface VSIXSnippetContribution {
  language: string;
  path: string;
}

export interface VSIXCommandContribution {
  command: string;
  title: string;
  category?: string;
}

export interface VSIXKeybindingContribution {
  command: string;
  key: string;
  when?: string;
  mac?: string;
  linux?: string;
  win?: string;
}

export interface VSIXLanguageContribution {
  id: string;
  aliases?: string[];
  extensions?: string[];
  configuration?: string;
  mimetypes?: string[];
}

export interface VSIXManifest {
  name: string;
  publisher: string;
  version: string;
  engines: { vscode: string };
  contributes: VSIXContributes;
  activationEvents?: string[];
  description?: string;
  displayName?: string;
}

export interface VSIXPackage {
  manifest: VSIXManifest;
  files: Map<string, Uint8Array>;
}

export interface VSIXConfig {
  cacheDir?: string;
  cdnUrl?: string;
}

/** Theme data extracted from a VSIX package (emitted via vsix:themes:loaded) */
export interface VSIXLoadedTheme {
  id: string;
  name: string;
  type: "light" | "dark" | "hc" | "hc-light";
  colors: Record<string, string>;
  tokenColors: Array<{
    scope: string | string[];
    settings: { foreground?: string; background?: string; fontStyle?: string };
  }>;
  semanticTokenColors?: Record<string, string>;
}

/** Icon theme data extracted from a VSIX package (emitted via vsix:icons:loaded) */
export interface VSIXLoadedIconTheme {
  id: string;
  name: string;
  /** File extension (e.g. ".ts") or filename → data URI */
  definitions: Map<string, string>;
  /** Folder name → data URI */
  folderMappings: Map<string, string>;
}

export interface VSIXModuleAPI {
  fetch(id: string, version?: string): Promise<VSIXPackage>;
  install(pkg: VSIXPackage): Promise<void>;
  getInstalled(): VSIXManifest[];
  uninstall(id: string): void;
  clearCache(): Promise<void>;
  /** Fetch extension metadata from Open VSX */
  getMetadata(id: string): Promise<import("./fetcher").OpenVSXMetadata>;
  /** Search the Open VSX registry */
  search(query: string, opts?: { size?: number; offset?: number; category?: string; sortBy?: string; sortOrder?: string }): Promise<import("./fetcher").OpenVSXSearchResult>;
  /** Fetch a text resource (e.g. README URL) */
  fetchText(url: string): Promise<string>;
  /** The base Open VSX API URL */
  readonly baseUrl: string;
}
