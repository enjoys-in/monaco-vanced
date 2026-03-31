// ── VSIX Module — Theme Loader ───────────────────────────────

import type { VSIXPackage, VSIXManifest } from "../types";
import { convertVSCodeTheme } from "../converters/theme-converter";

/**
 * Load themes from a VSIX package and register them via Monaco API.
 * Returns the list of registered theme IDs.
 */
export function loadThemes(
  pkg: VSIXPackage,
  manifest: VSIXManifest,
  monaco: { editor: { defineTheme(name: string, data: unknown): void } },
): string[] {
  const registered: string[] = [];
  const themes = manifest.contributes.themes;
  if (!themes) return registered;

  const decoder = new TextDecoder();

  for (const theme of themes) {
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
      registered.push(themeId);
    } catch (err) {
      console.warn(`[vsix-theme-loader] failed to load theme "${theme.label}":`, err);
    }
  }

  return registered;
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
