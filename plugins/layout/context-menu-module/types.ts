// ── Context Menu Module Types ──────────────────────────────

export type MenuItemType = "action" | "separator" | "submenu";

export interface ContextCondition {
  readonly when?: string;
  readonly languages?: string[];
  readonly schemes?: string[];
  readonly hasSelection?: boolean;
}

export interface MenuItem {
  readonly id: string;
  readonly label: string;
  readonly type?: MenuItemType;
  readonly icon?: string;
  readonly keybinding?: string;
  readonly command?: string;
  readonly group?: string;
  readonly order?: number;
  readonly condition?: ContextCondition;
  readonly children?: MenuItem[];
  readonly disabled?: boolean;
}

export interface MenuGroup {
  readonly id: string;
  readonly label?: string;
  readonly order?: number;
  readonly items: MenuItem[];
}

export type MenuContext = "editor" | "explorer" | "tab" | "sidebar" | "terminal" | "custom";

export interface ContextMenuState {
  readonly visible: boolean;
  readonly x: number;
  readonly y: number;
  readonly context: MenuContext;
  readonly items: MenuItem[];
}

export interface ContextMenuPluginOptions {
  readonly defaultGroups?: MenuGroup[];
}

export interface ContextMenuModuleAPI {
  registerItem(context: MenuContext, item: MenuItem): void;
  unregisterItem(context: MenuContext, itemId: string): void;
  registerGroup(context: MenuContext, group: MenuGroup): void;
  getItems(context: MenuContext, evalContext?: Record<string, unknown>): MenuItem[];
  show(context: MenuContext, x: number, y: number, evalContext?: Record<string, unknown>): void;
  dismiss(): void;
}
