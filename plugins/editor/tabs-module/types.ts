// ── Tabs-module types ───────────────────────────────────────

export interface TabEntry {
  uri: string;
  label: string;
  icon?: string;
  dirty: boolean;
  pinned: boolean;
  isPreview?: boolean;
  previewType?: string;
  sourceUri?: string;
}

export interface TabGroup {
  id: string;
  tabs: TabEntry[];
  activeUri: string | null;
}
