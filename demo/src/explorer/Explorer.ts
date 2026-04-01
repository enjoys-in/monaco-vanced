// ── Explorer — main component that assembles the full explorer panel ──
// Orchestrates: ExplorerService (state) + ExplorerTree (render) + ExplorerContextMenu
// Exposes a single mount point that returns an HTMLElement.

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { MockFsAPI } from "../mock-fs";
import type { TreeNode } from "./ExplorerTypes";
import type { ExplorerItemCallbacks } from "./ExplorerItem";
import { ExplorerService } from "./ExplorerService";
import { ExplorerContextMenu } from "./ExplorerContextMenu";
import { renderTree } from "./ExplorerTree";

export interface ExplorerOptions {
  fs: MockFsAPI;
  eventBus: EventBus;
  rootLabel?: string;
  onNotify?: (message: string, type?: string) => void;
}

export class Explorer {
  private service: ExplorerService;
  private contextMenu: ExplorerContextMenu;
  private container: HTMLElement;
  private treeContainer: HTMLElement;
  private options: ExplorerOptions;
  private unsub: (() => void) | null = null;

  constructor(options: ExplorerOptions) {
    this.options = options;
    this.service = new ExplorerService(options.fs, options.eventBus, options.rootLabel);
    this.contextMenu = new ExplorerContextMenu();

    // Wire context menu handler
    this.contextMenu.setHandler((action, node) => this.handleContextAction(action, node));

    // Build container
    this.container = document.createElement("div");
    this.container.style.cssText = "overflow-y:auto;overflow-x:hidden;height:100%;";
    this.container.className = "vsc-sidebar-content explorer-root";

    this.treeContainer = document.createElement("div");
    this.container.appendChild(this.treeContainer);

    // Subscribe to state changes
    this.unsub = this.service.subscribe(() => this.render());

    // Initial render
    this.render();
  }

  // ── Public API ──────────────────────────────────────────

  getElement(): HTMLElement {
    return this.container;
  }

  getService(): ExplorerService {
    return this.service;
  }

  /** Toolbar: new file in project root */
  newFile(): void {
    this.service.startInlineInput("", "file", 1);
  }

  /** Toolbar: new folder in project root */
  newFolder(): void {
    this.service.startInlineInput("", "folder", 1);
  }

  /** Toolbar: collapse all */
  collapseAll(): void {
    this.service.collapseAll();
  }

  /** Force rebuild the tree from FS */
  refresh(): void {
    this.service.buildTree();
  }

  dispose(): void {
    this.unsub?.();
    this.contextMenu.dispose();
    this.service.dispose();
  }

  // ── Render ──────────────────────────────────────────────

  private render(): void {
    const state = this.service.getState();
    this.treeContainer.innerHTML = "";

    // Root project node header
    const rootHeader = document.createElement("div");
    rootHeader.style.cssText = "display:flex;align-items:center;height:22px;padding:0 8px;font-size:11px;font-weight:600;letter-spacing:.5px;color:#858585;text-transform:uppercase;user-select:none;";
    rootHeader.textContent = state.rootLabel;
    this.treeContainer.appendChild(rootHeader);

    // Build callbacks
    const callbacks: ExplorerItemCallbacks = {
      onFileClick: (path) => this.service.openFile(path),
      onFolderToggle: (path) => this.service.toggleFolder(path),
      onContextMenu: (e, node) => this.contextMenu.show(e, node),
      onRenameConfirm: (newName) => this.service.confirmRename(newName),
      onRenameCancel: () => this.service.cancelRename(),
      onInlineConfirm: (name) => this.service.confirmInlineInput(name),
      onInlineCancel: () => this.service.cancelInlineInput(),
    };

    const fragment = renderTree(state.tree, state, 1, callbacks, "");
    this.treeContainer.appendChild(fragment);
  }

  // ── Context menu action handler ─────────────────────────

  private handleContextAction(action: string, node: TreeNode): void {
    const notify = this.options.onNotify;
    switch (action) {
      case "open":
        if (!node.isDirectory) this.service.openFile(node.path);
        break;
      case "openSide":
        // Emit open (in real VS Code this would go to a side editor group)
        if (!node.isDirectory) this.service.openFile(node.path);
        break;
      case "newFile":
        this.service.startInlineInput(node.path, "file", this.getDepth(node.path) + 1);
        break;
      case "newFolder":
        this.service.startInlineInput(node.path, "folder", this.getDepth(node.path) + 1);
        break;
      case "rename":
        this.service.startRename(node.path);
        break;
      case "delete":
        this.service.deleteItem(node.path);
        notify?.(`Deleted ${node.name}`, "info");
        break;
      case "copyPath":
        this.service.copyPath(node.path);
        notify?.("Copied path to clipboard", "info");
        break;
      case "copyRelPath":
        this.service.copyPath(node.path);
        notify?.("Copied relative path", "info");
        break;
      case "collapse":
        if (node.isDirectory) this.service.toggleFolder(node.path);
        break;
    }
  }

  private getDepth(path: string): number {
    return path ? path.split("/").length : 0;
  }
}
