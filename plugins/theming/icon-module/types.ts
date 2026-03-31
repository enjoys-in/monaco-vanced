// ── Icon Module — Shared Types ───────────────────────────────

export interface IconMapping {
  /** File extension (e.g. ".ts") → SVG path or icon name */
  [extension: string]: string;
}

export interface IconTheme {
  id: string;
  name: string;
  definitions: Map<string, string>;
  folderMappings?: Map<string, string>;
}

export interface IconConfig {
  cacheEnabled?: boolean;
  /** CDN base for vscode-icons SVGs (default: GitHub raw) */
  vsIconsCdn?: string;
  /** CDN base for @vscode/codicons (default: jsDelivr) */
  codiconsCdn?: string;
}

export interface IconModuleAPI {
  /** Get the full icon URL for a file or folder in the explorer */
  getFileIcon(filename: string, isDirectory?: boolean, isOpen?: boolean): string;
  /** Get a codicon CSS class name for VS Code UI elements */
  getCodicon(name: string): string;
  /** Get the full codicon SVG URL */
  getCodiconUrl(name: string): string;
  registerTheme(theme: IconTheme): void;
  getThemes(): IconTheme[];
  setTheme(id: string): void;
}
