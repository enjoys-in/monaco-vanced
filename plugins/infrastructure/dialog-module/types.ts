// ── Dialog Module — Types ──────────────────────────────────────

export type DialogType = "confirm" | "input" | "trust" | "auth" | "permission" | "custom" | "wizard";

/** Visual severity — drives the icon colour and default icon */
export type DialogSeverity = "info" | "warning" | "error" | "success";

export interface DialogAction {
  id: string;
  label: string;
  primary?: boolean;
  destructive?: boolean;
}

export interface DialogField {
  id: string;
  label: string;
  type: "text" | "password" | "select" | "checkbox" | "textarea";
  placeholder?: string;
  default?: unknown;
  options?: Array<{ label: string; value: string }>;
  required?: boolean;
}

export interface DialogConfig {
  id?: string;
  title: string;
  /** Simple string or array of paragraphs */
  body?: string | string[];
  type: DialogType;
  /** Severity level — adds a coloured icon next to the title */
  severity?: DialogSeverity;
  /** Custom SVG string or codicon name to override the default severity icon */
  icon?: string;
  actions?: DialogAction[];
  fields?: DialogField[];
  width?: number;
  closable?: boolean;
}

export interface DialogResult {
  action: string;
  values?: Record<string, unknown>;
}

export interface QuickPickItem {
  id: string;
  label: string;
  description?: string;
  detail?: string;
  picked?: boolean;
}

export interface QuickPickOptions {
  placeholder?: string;
  multiSelect?: boolean;
  matchOnDescription?: boolean;
}

export interface DialogModuleAPI {
  showConfirm(config: Omit<DialogConfig, "type">): Promise<DialogResult>;
  showInput(config: Omit<DialogConfig, "type">): Promise<DialogResult>;
  showCustom(config: DialogConfig): Promise<DialogResult>;
  showQuickPick(items: QuickPickItem[], options?: QuickPickOptions): Promise<QuickPickItem | QuickPickItem[] | null>;
  close(id: string): void;
  getActive(): DialogConfig[];
}
