// ── Explorer module barrel export ────────────────────────────

// React components
export { ExplorerView } from "./ExplorerView";
export type { ExplorerIconAPI } from "./ExplorerView";
export { ExplorerTreeView } from "./ExplorerTreeView";
export { ExplorerFileItem, ExplorerFolderItem, ExplorerInlineInput } from "./ExplorerItemView";
export { ExplorerContextMenuView } from "./ExplorerContextMenuView";

// Shared (used by React components)
export { ExplorerService } from "./ExplorerService";
export type {
  TreeNode,
  ExplorerState,
  InlineInputState,
  ContextMenuAction,
} from "./ExplorerTypes";
export { ExplorerAction, ExplorerEvents, getExtColor, getFolderColor } from "./ExplorerTypes";
