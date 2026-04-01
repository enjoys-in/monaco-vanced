// ── Explorer module barrel export ────────────────────────────

export { Explorer } from "./Explorer";
export type { ExplorerOptions, ExplorerIconAPI } from "./Explorer";
export { ExplorerService } from "./ExplorerService";
export { ExplorerContextMenu } from "./ExplorerContextMenu";
export { renderTree } from "./ExplorerTree";
export { renderFileItem, renderFolderItem, renderInlineInput } from "./ExplorerItem";
export type { ExplorerItemCallbacks } from "./ExplorerItem";
export type {
  TreeNode,
  ExplorerState,
  InlineInputState,
  ContextMenuAction,
} from "./ExplorerTypes";
// Re-exported from core — consumers can also import from @enjoys/monaco-vanced/core/events
export { ExplorerAction, ExplorerEvents, getExtColor, getFolderColor } from "./ExplorerTypes";
