// ── VSIX Module — Icon Loader ────────────────────────────────

import type { VSIXPackage, VSIXManifest } from "../types";
import { convertIconTheme } from "../converters/icon-converter";

/**
 * Load icon themes from a VSIX package.
 * Returns a Map of file extension/name → icon SVG path.
 */
export function loadIcons(
  pkg: VSIXPackage,
  manifest: VSIXManifest,
): Map<string, string> {
  const allIcons = new Map<string, string>();
  const icons = manifest.contributes.icons;
  if (!icons) return allIcons;

  const decoder = new TextDecoder();

  for (const icon of icons) {
    const fileKey = findFileKey(pkg.files, icon.path);
    if (!fileKey) {
      console.warn(`[vsix-icon-loader] icon theme file not found: ${icon.path}`);
      continue;
    }

    try {
      const jsonText = decoder.decode(pkg.files.get(fileKey)!);
      const iconDefs = JSON.parse(jsonText);
      const converted = convertIconTheme(iconDefs);
      for (const [key, value] of converted) {
        allIcons.set(key, value);
      }
    } catch (err) {
      console.warn(`[vsix-icon-loader] failed to load icon theme "${icon.id}":`, err);
    }
  }

  return allIcons;
}

function findFileKey(files: Map<string, Uint8Array>, path: string): string | undefined {
  for (const key of files.keys()) {
    if (key === path || key.endsWith(`/${path}`) || key.endsWith(path.replace(/^\.\//, ""))) {
      return key;
    }
  }
  return undefined;
}
