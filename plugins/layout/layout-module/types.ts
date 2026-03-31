// ── Layout Module Types ─────────────────────────────────────
// Types for the layout system: splits, panels, editor groups,
// webview panels, and overall layout state.

export type SplitDirection = "horizontal" | "vertical";

export type PanelLocation = "right" | "bottom" | "editor" | "modal";

export type PanelViewLocation = "sidebar" | "right" | "bottom";

export interface SplitNode {
  readonly id: string;
  readonly direction: SplitDirection;
  /** Ratio between 0 and 1 */
  ratio: number;
  readonly children: [string, string];
}

export interface EditorGroup {
  readonly id: string;
  readonly activeUri: string | null;
  readonly uris: string[];
}

export interface PanelView {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly location: PanelViewLocation;
  readonly order?: number;
  /**
   * Render function placeholder — host app bridges to React/DOM.
   * Plugins register the id; the host maps id → component.
   */
  readonly render?: () => unknown;
}

export interface LayoutState {
  readonly splits: SplitNode[];
  readonly editorGroups: EditorGroup[];
  readonly activeGroupId: string | null;
  readonly sidebarVisible: boolean;
  readonly sidebarWidth: number;
  readonly rightPanelVisible: boolean;
  readonly rightPanelWidth: number;
  readonly bottomPanelVisible: boolean;
  readonly bottomPanelHeight: number;
}

export interface LayoutPluginOptions {
  readonly defaultSidebarWidth?: number;
  readonly defaultRightPanelWidth?: number;
  readonly defaultBottomPanelHeight?: number;
  readonly minSidebarWidth?: number;
  readonly minRightPanelWidth?: number;
  readonly minBottomPanelHeight?: number;
  readonly persistState?: boolean;
  readonly storageKey?: string;
}

export interface LayoutModuleAPI {
  getState(): LayoutState;
  split(direction: SplitDirection, ratio?: number): string;
  unsplit(splitId: string): void;
  setSplitRatio(splitId: string, ratio: number): void;
  registerSidebarView(view: PanelView): void;
  registerBottomView(view: PanelView): void;
  registerRightView(view: PanelView): void;
  getRegisteredViews(location: PanelViewLocation): PanelView[];
  toggleSidebar(): void;
  toggleRightPanel(): void;
  toggleBottomPanel(): void;
  resizeSidebar(width: number): void;
  resizeRightPanel(width: number): void;
  resizeBottomPanel(height: number): void;
  focusGroup(groupId: string): void;
  addEditorGroup(): string;
  removeEditorGroup(groupId: string): void;
}
