// ── VSIX Module — Icon Loader ────────────────────────────────

import type { VSIXPackage, VSIXManifest, VSIXLoadedIconTheme } from "../types";

interface IconThemeDefinition {
  iconDefinitions?: Record<string, { iconPath?: string; fontCharacter?: string }>;
  fileExtensions?: Record<string, string>;
  fileNames?: Record<string, string>;
  folderNames?: Record<string, string>;
  folderNamesExpanded?: Record<string, string>;
  file?: string;
  folder?: string;
  folderExpanded?: string;
  languageIds?: Record<string, string>;
  light?: Omit<IconThemeDefinition, "iconDefinitions" | "fonts" | "light" | "highContrast">;
  highContrast?: Omit<IconThemeDefinition, "iconDefinitions" | "fonts" | "light" | "highContrast">;
  hidesExplorerArrows?: boolean;
  showLanguageModeIcons?: boolean;
}

/**
 * Load icon themes from a VSIX package.
 * Resolves icon SVG paths to data URIs from the package files.
 * Returns structured IconTheme objects for consumption by icon-module.
 */
export function loadIcons(
  pkg: VSIXPackage,
  manifest: VSIXManifest,
): VSIXLoadedIconTheme[] {
  const results: VSIXLoadedIconTheme[] = [];
  const icons = manifest.contributes.icons;
  if (!icons) return results;

  const decoder = new TextDecoder();

  for (const icon of icons) {
    const fileKey = findFileKey(pkg.files, icon.path);
    if (!fileKey) {
      console.warn(`[vsix-icon-loader] icon theme file not found: ${icon.path}`);
      continue;
    }

    try {
      const jsonText = decoder.decode(pkg.files.get(fileKey)!);
      const iconDefs = JSON.parse(jsonText) as IconThemeDefinition;

      // Resolve the base directory for relative icon paths
      const baseDir = fileKey.substring(0, fileKey.lastIndexOf("/") + 1);

      const definitions = new Map<string, string>();
      const folderMappings = new Map<string, string>();
      const defs = iconDefs.iconDefinitions ?? {};

      // Helper to resolve an iconPath to a data URI from the VSIX package
      function resolveIconUri(defId: string): string | undefined {
        const def = defs[defId];
        if (!def?.iconPath) return undefined;
        // Resolve relative path from the icon theme definition file
        const resolvedPath = resolvePath(baseDir, def.iconPath);
        const svgKey = findFileKey(pkg.files, resolvedPath);
        if (!svgKey) return undefined;
        const svgData = pkg.files.get(svgKey);
        if (!svgData) return undefined;
        const svgText = decoder.decode(svgData);
        return `data:image/svg+xml;base64,${btoa(svgText)}`;
      }

      // File extensions → data URIs
      if (iconDefs.fileExtensions) {
        for (const [ext, defId] of Object.entries(iconDefs.fileExtensions)) {
          const uri = resolveIconUri(defId);
          if (uri) definitions.set(`.${ext}`, uri);
        }
      }

      // Specific file names → data URIs
      if (iconDefs.fileNames) {
        for (const [name, defId] of Object.entries(iconDefs.fileNames)) {
          const uri = resolveIconUri(defId);
          if (uri) definitions.set(name, uri);
        }
      }

      // Language IDs → data URIs
      if (iconDefs.languageIds) {
        for (const [langId, defId] of Object.entries(iconDefs.languageIds)) {
          const uri = resolveIconUri(defId);
          if (uri) definitions.set(`lang:${langId}`, uri);
        }
      }

      // Default file icon
      if (iconDefs.file) {
        const uri = resolveIconUri(iconDefs.file);
        if (uri) definitions.set("_file_default", uri);
      }

      // Folder names → data URIs
      if (iconDefs.folderNames) {
        for (const [name, defId] of Object.entries(iconDefs.folderNames)) {
          const uri = resolveIconUri(defId);
          if (uri) folderMappings.set(name, uri);
        }
      }

      // Expanded folder names
      if (iconDefs.folderNamesExpanded) {
        for (const [name, defId] of Object.entries(iconDefs.folderNamesExpanded)) {
          const uri = resolveIconUri(defId);
          if (uri) folderMappings.set(`${name}:expanded`, uri);
        }
      }

      // Default folder icon
      if (iconDefs.folder) {
        const uri = resolveIconUri(iconDefs.folder);
        if (uri) folderMappings.set("_folder_default", uri);
      }

      // Default expanded folder icon
      if (iconDefs.folderExpanded) {
        const uri = resolveIconUri(iconDefs.folderExpanded);
        if (uri) folderMappings.set("_folder_expanded_default", uri);
      }

      results.push({
        id: icon.id,
        name: icon.label ?? icon.id,
        definitions,
        folderMappings,
      });
    } catch (err) {
      console.warn(`[vsix-icon-loader] failed to load icon theme "${icon.id}":`, err);
    }
  }

  return results;
}

function findFileKey(files: Map<string, Uint8Array>, path: string): string | undefined {
  // Normalize the search path
  const normalized = path.replace(/^\.\//, "");
  for (const key of files.keys()) {
    if (key === path || key === normalized || key.endsWith(`/${normalized}`)) {
      return key;
    }
  }
  return undefined;
}

/** Resolve a relative path against a base directory */
function resolvePath(base: string, relative: string): string {
  const rel = relative.replace(/^\.\//, "");
  const parts = (base + rel).split("/");
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "..") resolved.pop();
    else if (part !== "." && part !== "") resolved.push(part);
  }
  return resolved.join("/");
}
