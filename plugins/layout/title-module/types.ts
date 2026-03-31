// ── Title Module Types ─────────────────────────────────────

export interface TitleState {
  readonly fileName: string | null;
  readonly filePath: string | null;
  readonly isDirty: boolean;
  readonly language: string;
  readonly encoding: string;
  readonly branch: string | null;
  readonly breadcrumbs: BreadcrumbSegment[];
}

export interface BreadcrumbSegment {
  readonly label: string;
  readonly path: string;
  readonly isFile: boolean;
}

export interface TitlePluginOptions {
  readonly showBranch?: boolean;
  readonly showEncoding?: boolean;
  readonly showLanguage?: boolean;
  readonly defaultEncoding?: string;
}

export interface TitleModuleAPI {
  getState(): TitleState;
  setFileName(name: string | null): void;
  setFilePath(path: string | null): void;
  setDirty(dirty: boolean): void;
  setLanguage(language: string): void;
  setEncoding(encoding: string): void;
  setBranch(branch: string | null): void;
}
