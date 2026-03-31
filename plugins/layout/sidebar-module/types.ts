// ── Sidebar Module Types ───────────────────────────────────

export type SidebarPosition = "left" | "right";

export interface SidebarViewConfig {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly order?: number;
  readonly render?: () => unknown;
}

export interface SidebarState {
  readonly visible: boolean;
  readonly width: number;
  readonly position: SidebarPosition;
  readonly activeViewId: string | null;
  readonly views: SidebarViewConfig[];
}

export interface SidebarPluginOptions {
  readonly defaultWidth?: number;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly position?: SidebarPosition;
  readonly persistState?: boolean;
}

export interface SidebarModuleAPI {
  getState(): SidebarState;
  registerView(view: SidebarViewConfig): void;
  unregisterView(viewId: string): void;
  activateView(viewId: string): void;
  getActiveView(): string | null;
  getViews(): SidebarViewConfig[];
  toggle(): void;
  setWidth(width: number): void;
}
