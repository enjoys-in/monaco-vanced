export enum EditorEvents {
  Create = "editor:create",
  Destroy = "editor:destroy",
  Ready = "editor:ready",
  Focus = "editor:focus",
  Blur = "editor:blur",
  LanguageChange = "editor:language-change",
  Format = "editor:format",
  Formatted = "editor:formatted",
  OpenVirtual = "editor:open-virtual",
}

export enum ModelEvents {
  Create = "model:create",
  Dispose = "model:dispose",
}

export enum CursorEvents {
  Move = "cursor:move",
}

export enum SelectionEvents {
  Change = "selection:change",
}
