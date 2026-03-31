// ── Title State Manager ────────────────────────────────────
// Tracks active file name, dirty indicator, language, branch.

import type { TitleState } from "./types";

export class TitleStateManager {
  private state: {
    fileName: string | null;
    filePath: string | null;
    isDirty: boolean;
    language: string;
    encoding: string;
    branch: string | null;
  };

  constructor(defaultEncoding = "UTF-8") {
    this.state = {
      fileName: null,
      filePath: null,
      isDirty: false,
      language: "plaintext",
      encoding: defaultEncoding,
      branch: null,
    };
  }

  getState(): TitleState {
    return {
      ...this.state,
      breadcrumbs: this.buildBreadcrumbs(),
    };
  }

  setFileName(name: string | null): void {
    this.state.fileName = name;
  }

  setFilePath(path: string | null): void {
    this.state.filePath = path;
    if (path) {
      const parts = path.split("/");
      this.state.fileName = parts[parts.length - 1] ?? null;
    }
  }

  setDirty(dirty: boolean): void {
    this.state.isDirty = dirty;
  }

  setLanguage(language: string): void {
    this.state.language = language;
  }

  setEncoding(encoding: string): void {
    this.state.encoding = encoding;
  }

  setBranch(branch: string | null): void {
    this.state.branch = branch;
  }

  private buildBreadcrumbs(): TitleState["breadcrumbs"] {
    if (!this.state.filePath) return [];
    const parts = this.state.filePath.split("/").filter(Boolean);
    let currentPath = "";
    return parts.map((part, i) => {
      currentPath += (currentPath ? "/" : "") + part;
      return {
        label: part,
        path: currentPath,
        isFile: i === parts.length - 1,
      };
    });
  }

  dispose(): void {
    this.state.fileName = null;
    this.state.filePath = null;
  }
}
