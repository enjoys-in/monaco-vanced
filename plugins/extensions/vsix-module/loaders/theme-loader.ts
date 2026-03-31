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

      // Handle tokenColors as string path (e.g. "./Diner.tmTheme")
      let tokenColors = vsTheme.tokenColors ?? [];
      if (typeof tokenColors === "string") {
        const tmThemeKey = findFileKey(pkg.files, resolveRelativePath(fileKey, tokenColors));
        if (tmThemeKey) {
          const tmText = decoder.decode(pkg.files.get(tmThemeKey)!);
          tokenColors = parseTmThemeSettings(tmText);
        } else {
          console.warn(`[vsix-theme-loader] referenced tmTheme not found: ${tokenColors}`);
          tokenColors = [];
        }
      }

      const themeForMonaco = { ...vsTheme, tokenColors };
      const monacoTheme = convertVSCodeTheme(themeForMonaco);
      const themeId = toKebabCase(theme.label || vsTheme.name || fileKey);

      monaco.editor.defineTheme(themeId, monacoTheme);
      registeredIds.push(themeId);

      // Build structured theme data for theme-module consumption
      const uiTheme = theme.uiTheme ?? vsTheme.type ?? "vs-dark";
      let type: VSIXLoadedTheme["type"] = "dark";
      if (uiTheme === "vs" || uiTheme === "vs-light" || vsTheme.type === "light") type = "light";
      else if (uiTheme === "hc-light" || vsTheme.type === "hc-light") type = "hc-light";
      else if (uiTheme === "hc-black" || vsTheme.type === "hc") type = "hc";

      themes.push({
        id: themeId,
        name: theme.label || vsTheme.name || themeId,
        type,
        colors: vsTheme.colors ?? {},
        tokenColors,
        semanticTokenColors: vsTheme.semanticTokenColors,
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

/** Resolve a relative path from a file key (e.g. "./tokens.tmTheme" relative to "extension/themes/dark.json") */
function resolveRelativePath(fromFileKey: string, relativePath: string): string {
  const baseDir = fromFileKey.substring(0, fromFileKey.lastIndexOf("/") + 1);
  const rel = relativePath.replace(/^\.\//, "");
  const parts = (baseDir + rel).split("/");
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "..") resolved.pop();
    else if (part !== "." && part !== "") resolved.push(part);
  }
  return resolved.join("/");
}

/**
 * Parse a .tmTheme (plist XML) file and extract the tokenColor settings array.
 * Uses a lightweight regex-based approach (no full plist parser required).
 */
function parseTmThemeSettings(
  tmThemeText: string,
): Array<{ scope?: string | string[]; settings: Record<string, string> }> {
  const results: Array<{ scope?: string | string[]; settings: Record<string, string> }> = [];

  // Try JSON first (some .tmTheme files are actually JSON)
  try {
    const parsed = JSON.parse(tmThemeText);
    if (Array.isArray(parsed.settings)) return parsed.settings;
    if (Array.isArray(parsed.tokenColors)) return parsed.tokenColors;
  } catch {
    // Not JSON — parse as plist XML
  }

  // Extract <dict> blocks within the settings array from plist XML
  const settingsMatch = tmThemeText.match(/<key>settings<\/key>\s*<array>([\s\S]*?)<\/array>/);
  if (!settingsMatch) return results;

  const dictBlocks = settingsMatch[1].match(/<dict>([\s\S]*?)<\/dict>/g);
  if (!dictBlocks) return results;

  for (const block of dictBlocks) {
    const entry: { scope?: string | string[]; settings: Record<string, string> } = { settings: {} };

    // Extract scope
    const scopeMatch = block.match(/<key>scope<\/key>\s*<string>([\s\S]*?)<\/string>/);
    if (scopeMatch) {
      const scopeStr = scopeMatch[1].trim();
      entry.scope = scopeStr.includes(",") ? scopeStr.split(",").map((s) => s.trim()) : scopeStr;
    }

    // Extract settings dict
    const settingsDictMatch = block.match(/<key>settings<\/key>\s*<dict>([\s\S]*?)<\/dict>/);
    if (settingsDictMatch) {
      const keyValues = settingsDictMatch[1].matchAll(/<key>(\w+)<\/key>\s*<string>([\s\S]*?)<\/string>/g);
      for (const kv of keyValues) {
        entry.settings[kv[1]] = kv[2].trim();
      }
    }

    if (Object.keys(entry.settings).length > 0) {
      results.push(entry);
    }
  }

  return results;
}
