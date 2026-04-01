// ── Explorer Tree — recursive tree renderer ─────────────────
// Stateless: builds DOM from TreeNode[] + ExplorerState.
// Re-renders on service state change.

import type { TreeNode, ExplorerState } from "./ExplorerTypes";
import type { ExplorerItemCallbacks } from "./ExplorerItem";
import { renderFileItem, renderFolderItem, renderInlineInput } from "./ExplorerItem";

export function renderTree(
  nodes: TreeNode[],
  state: ExplorerState,
  depth: number,
  callbacks: ExplorerItemCallbacks,
  parentPath: string,
): DocumentFragment {
  const frag = document.createDocumentFragment();

  // Sort: folders first, then alphabetical (case-insensitive)
  const sorted = [...nodes].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  // If there's an inline input targeting this parent, inject it at top
  const inlineInput = state.inlineInput;
  if (inlineInput && inlineInput.parentPath === parentPath) {
    frag.appendChild(renderInlineInput(
      inlineInput.type,
      depth,
      callbacks.onInlineConfirm!,
      callbacks.onInlineCancel!,
    ));
  }

  for (const node of sorted) {
    if (node.name === ".gitkeep") continue; // hide placeholder files

    if (node.isDirectory) {
      const { header, childContainer } = renderFolderItem(node, depth, callbacks);
      const children = node.children ?? [];
      childContainer.appendChild(renderTree(children, state, depth + 1, callbacks, node.path));
      frag.appendChild(header);
      frag.appendChild(childContainer);
    } else {
      const isActive = state.activeFileUri === node.path;
      const isOpen = state.openFileUris.has(node.path);
      const isModified = state.modifiedFileUris.has(node.path);
      const isRenaming = state.renaming === node.path;
      frag.appendChild(renderFileItem(node, depth, isActive, isOpen, isModified, isRenaming, callbacks));
    }
  }

  return frag;
}
