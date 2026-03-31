// ── Preview-module types ────────────────────────────────────

export type PreviewableType =
  | "markdown"
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "font"
  | "html"
  | "svg"
  | "json"
  | "csv";

export interface PreviewProvider {
  id: PreviewableType;
  extensions: string[];
  mimeTypes: string[];
  render(file: PreviewFile): Promise<string>;
  supportsLiveUpdate?: boolean;
  toolbarActions?: PreviewToolbarAction[];
}

export interface PreviewFile {
  uri: string;
  name: string;
  extension: string;
  content: Uint8Array | string;
  objectUrl?: string;
  size: number;
}

export interface PreviewToolbarAction {
  id: string;
  icon: string;
  tooltip: string;
  toggle?: boolean;
}

export interface PreviewPanel {
  readonly id: string;
  readonly fileUri: string;
  readonly previewType: PreviewableType;
  refresh(): void;
  updateContent(content: Uint8Array | string): void;
  dispose(): void;
}

export interface PreviewOptions {
  location?: "tab" | "side" | "right-panel" | "bottom-panel";
  lockToSource?: boolean;
  sideBySide?: boolean;
}

export interface PreviewTab {
  uri: string;
  label: string;
  icon: string;
  isPreview: true;
  previewType: PreviewableType;
  sourceUri: string;
  lockToSource: boolean;
}
