// ── VSIX Module — Theme Loader ───────────────────────────────

import type { VSIXPackage, VSIXManifest, VSIXLoadedTheme } from "../types";
import { convertVSCodeTheme } from "../converters/theme-converter";

export interface ThemeLoadResult {
  registeredIds: string[];
  themes: VSIXLoadedTheme[];
}

/**
 * Load themes from a VSIX package and register them via Monaco API.
 * Also returns structured ThemeDefinition data for consumption by theme-module.
 */
export function loadThemes(
  pkg: VSIXPackage,
  manifest: VSIXManifest,
  monaco: { editor: { defineTheme(name: string, data: unknown): void } },
): ThemeLoadResult {
  const registeredIds: string[] = [];
  const themes: VSIXLoadedTheme[] = [];
  const themeContribs = manifest.contributes.themes;
  if (!themeContribs) return { registeredIds, themes };

  const decoder = new TextDecoder();

  for (const theme of themeContribs) {
    const fileKey = findFileKey(pkg.files, theme.path);
    if (!fileKey) {
      console.warn(`[vsix-theme-loader] theme file not found: ${theme.path}`);
      continue;
    }

    try {
      const jsonText = decoder.decode(pkg.files.get(fileKey)!);
      const vsTheme = JSON.parse(jsonText);
      const monacoTheme = convertVSCodeTheme(vsTheme);
      const themeId = toKebabCase(theme.label || vsTheme.name || fileKey);

      monaco.editor.defineTheme(themeId, monacoTheme);
      registeredIds.push(themeId);

      // Build structured theme data for theme-module consumption
      const uiTheme = theme.uiTheme ?? vsTheme.type ?? "vs-dark";
      let type: VSIXLoadedTheme["type"] = "dark";
      if (uiTheme === "vs" || uiTheme === "vs-light" || vsTheme.type === "light") type = "light";
      else if (uiTheme === "hc-black" || uiTheme === "hc-light" || vsTheme.type === "hc") type = "hc";

      themes.push({
        id: themeId,
        name: theme.label || vsTheme.name || themeId,
        type,
        colors: vsTheme.colors ?? {},
        tokenColors: vsTheme.tokenColors ?? [],
      });
    } catch (err) {
      console.warn(`[vsix-theme-loader] failed to load theme "${theme.label}":`, err);
    }
  }

  return { registeredIds, themes };
}

function findFileKey(files: Map<string, Uint8Array>, path: string): string | undefined {
  for (const key of files.keys()) {
    if (key === path || key.endsWith(`/${path}`) || key.endsWith(path.replace(/^\.\//, ""))) {
      return key;
    }
  }
  return undefined;
}

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
