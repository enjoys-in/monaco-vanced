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

export interface VSIXModuleAPI {
  fetch(id: string, version?: string): Promise<VSIXPackage>;
  install(pkg: VSIXPackage): Promise<void>;
  getInstalled(): VSIXManifest[];
  uninstall(id: string): void;
  clearCache(): Promise<void>;
}
