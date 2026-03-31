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
  cdnUrl?: string;
}

export interface IconModuleAPI {
  getIcon(filename: string): string | undefined;
  registerTheme(theme: IconTheme): void;
  getThemes(): IconTheme[];
  setTheme(id: string): void;
}
