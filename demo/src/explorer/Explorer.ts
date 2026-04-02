// ── Explorer — main component that assembles the full explorer panel ──
// Orchestrates: ExplorerService (state) + ExplorerTree (render) + ExplorerContextMenu
// Exposes a single mount point that returns an HTMLElement.

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { ExplorerAction, PanelEvents, SettingsEvents, ThemeEvents, AiEvents } from "@enjoys/monaco-vanced/core/events";
import type { MockFsAPI } from "../mock-fs";
import type { TreeNode } from "./ExplorerTypes";
import type { ExplorerItemCallbacks } from "./ExplorerItem";
import { C } from "../wireframe/types";
import { ExplorerService } from "./ExplorerService";
import { ExplorerContextMenu } from "./ExplorerContextMenu";
import { renderTree } from "./ExplorerTree";

/** Minimal icon API subset required by Explorer */
export interface ExplorerIconAPI {
  getFileIcon(filename: string, isDirectory?: boolean, isOpen?: boolean): string;
}

export interface ExplorerOptions {
  fs: MockFsAPI;
  eventBus: EventBus;
  rootLabel?: string;
  onNotify?: (message: string, type?: string) => void;
  /** Icon module API for vscode-icons file/folder icons */
  iconApi?: ExplorerIconAPI;
}

export class Explorer {
  private service: ExplorerService;
  private contextMenu: ExplorerContextMenu;
  private container: HTMLElement;
  private treeContainer: HTMLElement;
  private options: ExplorerOptions;
  private unsub: (() => void) | null = null;
  private eventDisposers: (() => void)[] = [];

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

    // Wire settings + theme change events
    this.wireSettingsEvents();

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

  /** Toolbar: new file — uses active file's parent or selected folder as context */
  newFile(): void {
    const parentPath = this.resolveNewItemParent();
    const depth = parentPath ? parentPath.split("/").length + 1 : 1;
    this.service.startInlineInput(parentPath, "file", depth);
  }

  /** Toolbar: new folder — uses active file's parent or selected folder as context */
  newFolder(): void {
    const parentPath = this.resolveNewItemParent();
    const depth = parentPath ? parentPath.split("/").length + 1 : 1;
    this.service.startInlineInput(parentPath, "folder", depth);
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
    for (const d of this.eventDisposers) d();
    this.contextMenu.dispose();
    this.service.dispose();
  }

  // ── Smart path resolution ───────────────────────────────

  /** Resolve the best parent path for a new file/folder based on active context */
  private resolveNewItemParent(): string {
    const state = this.service.getState();
    const selected = state.selectedPath;
    if (!selected) return "";

    // Check if selectedPath is a directory in the FS
    const stat = this.options.fs.stat(selected);
    if (stat && stat.type === "directory") return selected;

    // It's a file — use its parent directory
    const slashIdx = selected.lastIndexOf("/");
    return slashIdx >= 0 ? selected.slice(0, slashIdx) : "";
  }

  // ── Settings / Theme event wiring ─────────────────────

  private wireSettingsEvents(): void {
    const eb = this.options.eventBus;

    const onSettingsChange = (p: unknown) => {
      const payload = p as { id?: string; key?: string; value?: unknown };
      const key = payload.id ?? payload.key ?? "";
      // Explorer-related settings that need re-render
      const explorerKeys = ["explorer.sortOrder", "explorer.compactFolders", "files.exclude", "explorer.showHiddenFiles"];
      if (explorerKeys.includes(key)) {
        this.render();
      }
    };

    const onThemeChange = () => {
      // Theme changed — re-render explorer to pick up new colors
      this.render();
    };

    eb.on(SettingsEvents.Change, onSettingsChange);
    eb.on(ThemeEvents.Changed, onThemeChange);
    this.eventDisposers.push(
      () => eb.off(SettingsEvents.Change, onSettingsChange),
      () => eb.off(ThemeEvents.Changed, onThemeChange),
    );
  }

  // ── Render ──────────────────────────────────────────────

  private render(): void {
    const state = this.service.getState();
    this.treeContainer.innerHTML = "";

    // Root project node header
    const rootHeader = document.createElement("div");
    rootHeader.style.cssText = `display:flex;align-items:center;height:22px;padding:0 8px;font-size:11px;font-weight:600;letter-spacing:.5px;color:${C.fgDim};text-transform:uppercase;user-select:none;`;
    rootHeader.textContent = state.rootLabel;
    this.treeContainer.appendChild(rootHeader);

    // Build callbacks (includes icon resolver if available)
    const callbacks: ExplorerItemCallbacks = {
      onFileClick: (path) => { this.service.setSelectedPath(path); this.service.openFile(path); },
      onFolderToggle: (path) => { this.service.setSelectedPath(path); this.service.toggleFolder(path); },
      onContextMenu: (e, node) => { this.service.setSelectedPath(node.path); this.contextMenu.show(e, node); },
      onRenameConfirm: (newName) => this.service.confirmRename(newName),
      onRenameCancel: () => this.service.cancelRename(),
      onInlineConfirm: (name) => this.service.confirmInlineInput(name),
      onInlineCancel: () => this.service.cancelInlineInput(),
      getFileIcon: this.options.iconApi?.getFileIcon.bind(this.options.iconApi),
    };

    const fragment = renderTree(state.tree, state, 1, callbacks, "");
    this.treeContainer.appendChild(fragment);
  }

  // ── Context menu action handler ─────────────────────────

  private handleContextAction(action: ExplorerAction, node: TreeNode): void {
    const notify = this.options.onNotify;
    switch (action) {
      case ExplorerAction.Open:
        if (!node.isDirectory) this.service.openFile(node.path);
        break;
      case ExplorerAction.OpenSide:
        if (!node.isDirectory) this.service.openFileSide(node.path);
        break;
      case ExplorerAction.NewFile:
        this.service.startInlineInput(node.path, "file", this.getDepth(node.path) + 1);
        break;
      case ExplorerAction.NewFolder:
        this.service.startInlineInput(node.path, "folder", this.getDepth(node.path) + 1);
        break;
      case ExplorerAction.Rename:
        this.service.startRename(node.path);
        break;
      case ExplorerAction.Delete:
        this.service.deleteItem(node.path);
        notify?.(`Deleted ${node.name}`, "info");
        break;
      case ExplorerAction.CopyPath:
        this.service.copyPath(node.path);
        notify?.("Copied path to clipboard", "info");
        break;
      case ExplorerAction.CopyRelativePath:
        this.service.copyPath(node.path);
        notify?.("Copied relative path", "info");
        break;
      case ExplorerAction.CopyContent:
        if (!node.isDirectory) {
          const content = this.options.fs.readFile(node.path);
          if (content != null) {
            navigator.clipboard.writeText(content).catch(() => {});
            notify?.("Copied file content to clipboard", "info");
          }
        }
        break;
      case ExplorerAction.Duplicate:
        if (!node.isDirectory) {
          const ext = node.name.includes(".") ? node.name.slice(node.name.lastIndexOf(".")) : "";
          const base = node.name.includes(".") ? node.name.slice(0, node.name.lastIndexOf(".")) : node.name;
          const parentDir = node.path.includes("/") ? node.path.slice(0, node.path.lastIndexOf("/")) : "";
          const dupPath = parentDir ? `${parentDir}/${base}-copy${ext}` : `${base}-copy${ext}`;
          const content = this.options.fs.readFile(node.path) ?? "";
          this.service.createFile(dupPath, content);
          notify?.(`Duplicated as ${base}-copy${ext}`, "info");
        }
        break;
      case ExplorerAction.CollapseFolder:
        if (node.isDirectory) this.service.toggleFolder(node.path);
        break;
      case ExplorerAction.OpenInTerminal: {
        // Open the bottom panel with Terminal tab focused
        const dir = node.isDirectory ? node.path : (node.path.includes("/") ? node.path.slice(0, node.path.lastIndexOf("/")) : "");
        this.options.eventBus?.emit(PanelEvents.BottomToggle, {});
        this.options.eventBus?.emit(PanelEvents.BottomFocusTab, { tab: "Terminal", cwd: dir || "." });
        break;
      }
      case ExplorerAction.AddFileToChat: {
        if (!node.isDirectory) {
          this.options.eventBus?.emit(AiEvents.AttachFile, { uri: node.path, name: node.name });
          this.options.eventBus?.emit(AiEvents.OpenChat, {});
        }
        break;
      }
      case ExplorerAction.AddFolderToChat: {
        if (node.isDirectory) {
          this.options.eventBus?.emit(AiEvents.AttachFolder, { uri: node.path, name: node.name });
          this.options.eventBus?.emit(AiEvents.OpenChat, {});
        }
        break;
      }
    }
  }

  private getDepth(path: string): number {
    return path ? path.split("/").length : 0;
  }
}
