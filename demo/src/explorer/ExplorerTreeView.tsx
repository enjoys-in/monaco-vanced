// ── Explorer Tree (React) — recursive tree renderer ──────────
// Pure component: renders TreeNode[] + ExplorerState into JSX.

import { useMemo } from "react";
import type { TreeNode, ExplorerState } from "./ExplorerTypes";
import type { ExplorerIconAPI } from "./ExplorerView";
import { ExplorerFileItem, ExplorerFolderItem, ExplorerInlineInput } from "./ExplorerItemView";

interface Props {
  nodes: TreeNode[];
  state: ExplorerState;
  depth: number;
  parentPath: string;
  iconApi?: ExplorerIconAPI;
  onFileClick: (path: string) => void;
  onFolderToggle: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
  onRenameConfirm: (name: string) => void;
  onRenameCancel: () => void;
  onInlineConfirm: (name: string) => void;
  onInlineCancel: () => void;
}

export function ExplorerTreeView({
  nodes, state, depth, parentPath, iconApi,
  onFileClick, onFolderToggle, onContextMenu,
  onRenameConfirm, onRenameCancel, onInlineConfirm, onInlineCancel,
}: Props) {
  const sorted = useMemo(() =>
    [...nodes].sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    }),
  [nodes]);

  const inlineInput = state.inlineInput;
  const showInline = inlineInput && inlineInput.parentPath === parentPath;

  return (
    <>
      {showInline && (
        <ExplorerInlineInput
          type={inlineInput!.type}
          depth={depth}
          iconApi={iconApi}
          onConfirm={onInlineConfirm}
          onCancel={onInlineCancel}
        />
      )}

      {sorted.map((node) => {
        if (node.name === ".gitkeep" || node.name === ".git") return null;

        if (node.isDirectory) {
          return (
            <ExplorerFolderItem
              key={node.path}
              node={node}
              depth={depth}
              state={state}
              iconApi={iconApi}
              onFolderToggle={onFolderToggle}
              onContextMenu={onContextMenu}
              onFileClick={onFileClick}
              onRenameConfirm={onRenameConfirm}
              onRenameCancel={onRenameCancel}
              onInlineConfirm={onInlineConfirm}
              onInlineCancel={onInlineCancel}
            />
          );
        }

        return (
          <ExplorerFileItem
            key={node.path}
            node={node}
            depth={depth}
            isActive={state.activeFileUri === node.path}
            isOpen={state.openFileUris.has(node.path)}
            isModified={state.modifiedFileUris.has(node.path)}
            isRenaming={state.renaming === node.path}
            iconApi={iconApi}
            onFileClick={onFileClick}
            onContextMenu={onContextMenu}
            onRenameConfirm={onRenameConfirm}
            onRenameCancel={onRenameCancel}
          />
        );
      })}
    </>
  );
}
