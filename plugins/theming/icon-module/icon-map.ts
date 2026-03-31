// ── Icon Module — vscode-icons Resolver ──────────────────────
// Uses vscode-icons-js to resolve file/folder names to SVG filenames.
// Icons are served from the vscode-icons GitHub CDN.

import { getIconForFile, getIconForFolder, getIconForOpenFolder } from "vscode-icons-js";

const DEFAULT_CDN =
  "https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons";

export class VSCodeIconResolver {
  private readonly cdnBase: string;

  constructor(cdnBase = DEFAULT_CDN) {
    this.cdnBase = cdnBase.replace(/\/+$/, "");
  }

  /**
   * Resolve a filename/dirname to a full CDN SVG URL.
   * Uses vscode-icons-js for mapping; falls back to default icons.
   */
  resolve(name: string, isDirectory: boolean, isOpen = false): string {
    let iconFile: string | undefined;

    if (isDirectory) {
      iconFile = isOpen ? getIconForOpenFolder(name) : getIconForFolder(name);
    } else {
      iconFile = getIconForFile(name);
    }

    if (!iconFile) {
      iconFile = isDirectory ? "default_folder.svg" : "default_file.svg";
    }

    return `${this.cdnBase}/${iconFile}`;
  }
}

// ── @vscode/codicons helper ──────────────────────────────────
// Codicons are VS Code UI icons (not file icons).
// They ship as an icon font + individual SVGs on CDN.

const DEFAULT_CODICONS_CDN =
  "https://cdn.jsdelivr.net/npm/@vscode/codicons@latest/src/icons";

export class CodiconResolver {
  private readonly cdnBase: string;

  constructor(cdnBase = DEFAULT_CODICONS_CDN) {
    this.cdnBase = cdnBase.replace(/\/+$/, "");
  }

  /** Returns the codicon CSS class (e.g. "codicon codicon-search") */
  className(name: string): string {
    return `codicon codicon-${name}`;
  }

  /** Returns the full SVG URL from CDN */
  svgUrl(name: string): string {
    return `${this.cdnBase}/${name}.svg`;
  }
}
