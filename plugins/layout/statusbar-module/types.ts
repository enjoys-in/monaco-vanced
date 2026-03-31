// ── Statusbar Module Types ─────────────────────────────────

export type StatusbarAlignment = "left" | "right";

export interface StatusbarItem {
  readonly id: string;
  readonly label: string;
  readonly tooltip?: string;
  readonly icon?: string;
  readonly alignment: StatusbarAlignment;
  readonly priority?: number;
  readonly command?: string;
  readonly visible?: boolean;
  readonly color?: string;
  readonly backgroundColor?: string;
}

export interface StatusbarState {
  readonly items: StatusbarItem[];
}

export interface StatusbarPluginOptions {
  readonly defaultItems?: StatusbarItem[];
}

export interface StatusbarModuleAPI {
  getItems(alignment?: StatusbarAlignment): StatusbarItem[];
  register(item: StatusbarItem): void;
  update(id: string, changes: Partial<Omit<StatusbarItem, "id">>): void;
  remove(id: string): void;
  setVisible(id: string, visible: boolean): void;
}
