// ── Explorer module barrel export ────────────────────────────

// React components (primary)
export { ExplorerView } from "./ExplorerView";
export type { ExplorerIconAPI } from "./ExplorerView";
export { ExplorerTreeView } from "./ExplorerTreeView";
export { ExplorerFileItem, ExplorerFolderItem, ExplorerInlineInput } from "./ExplorerItemView";
export { ExplorerContextMenuView } from "./ExplorerContextMenuView";

// Legacy class-based (kept for backward compat)
export { Explorer } from "./Explorer";
export type { ExplorerOptions } from "./Explorer";

// Shared (used by both React and legacy)
export { ExplorerService } from "./ExplorerService";
export type {
  TreeNode,
  ExplorerState,
  InlineInputState,
  ContextMenuAction,
} from "./ExplorerTypes";
export { ExplorerAction, ExplorerEvents, getExtColor, getFolderColor } from "./ExplorerTypes";
