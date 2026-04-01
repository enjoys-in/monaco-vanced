// ── Explorer module barrel export ────────────────────────────

export { Explorer } from "./Explorer";
export type { ExplorerOptions } from "./Explorer";
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
  ExplorerEvents,
} from "./ExplorerTypes";
export { EXPLORER_EVENTS, getExtColor, getFolderColor } from "./ExplorerTypes";
