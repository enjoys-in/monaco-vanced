// ── VSIX Module — Icon Converter ─────────────────────────────
// Extracts file extension → icon SVG path mappings from icon theme definitions.

interface IconThemeDefinitions {
  iconDefinitions?: Record<string, { iconPath: string }>;
  fileExtensions?: Record<string, string>;
  fileNames?: Record<string, string>;
  folderNames?: Record<string, string>;
  folderNamesExpanded?: Record<string, string>;
  file?: string;
  folder?: string;
  folderExpanded?: string;
}

/**
 * Convert a VS Code icon theme definition to a Map of file extension → icon SVG path.
 */
export function convertIconTheme(iconDefs: IconThemeDefinitions): Map<string, string> {
  const result = new Map<string, string>();
  const definitions = iconDefs.iconDefinitions ?? {};

  // Map file extensions
  if (iconDefs.fileExtensions) {
    for (const [ext, defId] of Object.entries(iconDefs.fileExtensions)) {
      const def = definitions[defId];
      if (def?.iconPath) {
        result.set(`.${ext}`, def.iconPath);
      }
    }
  }

  // Map specific file names
  if (iconDefs.fileNames) {
    for (const [name, defId] of Object.entries(iconDefs.fileNames)) {
      const def = definitions[defId];
      if (def?.iconPath) {
        result.set(name, def.iconPath);
      }
    }
  }

  // Map folder names
  if (iconDefs.folderNames) {
    for (const [name, defId] of Object.entries(iconDefs.folderNames)) {
      const def = definitions[defId];
      if (def?.iconPath) {
        result.set(`folder:${name}`, def.iconPath);
      }
    }
  }

  // Default file icon
  if (iconDefs.file) {
    const def = definitions[iconDefs.file];
    if (def?.iconPath) {
      result.set("_file_default", def.iconPath);
    }
  }

  // Default folder icon
  if (iconDefs.folder) {
    const def = definitions[iconDefs.folder];
    if (def?.iconPath) {
      result.set("_folder_default", def.iconPath);
    }
  }

  return result;
}
