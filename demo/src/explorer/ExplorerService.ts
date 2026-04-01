// ── Explorer Service — state management & FS operations ─────
// Pure logic layer — no DOM. Components subscribe to state changes.

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { FileEvents } from "@enjoys/monaco-vanced/core/events";
import type { MockFsAPI } from "../mock-fs";
import type { TreeNode, ExplorerState, InlineInputState } from "./ExplorerTypes";
 
export type StateListener = () => void;

export class ExplorerService {
  private state: ExplorerState;
  private listeners: Set<StateListener> = new Set();
  private disposers: (() => void)[] = [];
  private rebuildTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private fs: MockFsAPI,
    private eventBus: EventBus,
    rootLabel = "MONACO-VANCED",
  ) {
    this.state = {
      rootLabel,
      tree: [],
      activeFileUri: null,
      selectedPath: null,
      openFileUris: new Set(),
      modifiedFileUris: new Set(),
      expandedPaths: new Set(),
      renaming: null,
      inlineInput: null,
    };

    this.buildTree();
    this.wireEvents();
  }

  // ── Public API ──────────────────────────────────────────

  getState(): Readonly<ExplorerState> {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ── Tree operations ─────────────────────────────────────

  buildTree(): void {
    this.state.tree = this.buildTreeFromFs("");
    // Auto-expand root-level folders
    for (const node of this.state.tree) {
      if (node.isDirectory) this.state.expandedPaths.add(node.path);
    }
    this.notify();
  }

  private buildTreeFromFs(dirPath: string): TreeNode[] {
    const entries = this.fs.readDir(dirPath);
    return entries.map((entry) => {
      if (entry.type === "directory") {
        const children = this.buildTreeFromFs(entry.path);
        return {
          name: entry.name,
          path: entry.path,
          isDirectory: true,
          children,
          expanded: this.state.expandedPaths.has(entry.path),
        };
      }
      return {
        name: entry.name,
        path: entry.path,
        isDirectory: false,
      };
    });
  }

  // ── Expand / Collapse ───────────────────────────────────

  toggleFolder(path: string): void {
    if (this.state.expandedPaths.has(path)) {
      this.state.expandedPaths.delete(path);
    } else {
      this.state.expandedPaths.add(path);
    }
    this.updateExpanded(this.state.tree);
    this.notify();
  }

  collapseAll(): void {
    this.state.expandedPaths.clear();
    this.updateExpanded(this.state.tree);
    this.notify();
  }

  private updateExpanded(nodes: TreeNode[]): void {
    for (const node of nodes) {
      if (node.isDirectory) {
        node.expanded = this.state.expandedPaths.has(node.path);
        if (node.children) this.updateExpanded(node.children);
      }
    }
  }

  // ── File selection ──────────────────────────────────────

  setActiveFile(uri: string | null): void {
    this.state.activeFileUri = uri;
    if (uri) {
      this.state.openFileUris.add(uri);
      this.state.selectedPath = uri;
    }
    this.notify();
  }

  /** Track the last-clicked node (file or folder) for smart new-item placement */
  setSelectedPath(path: string): void {
    this.state.selectedPath = path;
  }

  markModified(uri: string): void {
    this.state.modifiedFileUris.add(uri);
    this.notify();
  }

  markSaved(uri: string): void {
    this.state.modifiedFileUris.delete(uri);
    this.notify();
  }

  // ── File open ───────────────────────────────────────────

  openFile(path: string): void {
    this.eventBus.emit(FileEvents.Open, {
      uri: path,
      label: path.split("/").pop() ?? path,
    });
  }

  // ── CRUD operations ─────────────────────────────────────

  createFile(path: string, content = ""): void {
    if (this.fs.exists(path)) return;
    this.fs.writeFile(path, content);
    this.buildTree();
    this.openFile(path);
  }

  createFolder(path: string): void {
    this.fs.createDir(path);
    // Create placeholder so folder appears in tree
    if (!this.fs.exists(path + "/.gitkeep")) {
      this.fs.writeFile(path + "/.gitkeep", "");
    }
    this.state.expandedPaths.add(path);
    this.buildTree();
  }

  deleteItem(path: string): void {
    this.fs.deleteFile(path);
    this.state.openFileUris.delete(path);
    this.state.modifiedFileUris.delete(path);
    if (this.state.activeFileUri === path) {
      this.state.activeFileUri = null;
    }
    this.buildTree();
  }

  renameItem(oldPath: string, newPath: string): void {
    if (this.fs.exists(newPath)) return;
    this.fs.rename(oldPath, newPath);
    // Update tracking sets
    if (this.state.openFileUris.has(oldPath)) {
      this.state.openFileUris.delete(oldPath);
      this.state.openFileUris.add(newPath);
    }
    if (this.state.modifiedFileUris.has(oldPath)) {
      this.state.modifiedFileUris.delete(oldPath);
      this.state.modifiedFileUris.add(newPath);
    }
    if (this.state.activeFileUri === oldPath) {
      this.state.activeFileUri = newPath;
    }
    this.state.renaming = null;
    this.buildTree();
  }

  copyPath(path: string): void {
    navigator.clipboard.writeText(path).catch(() => {});
  }

  // ── Inline input ────────────────────────────────────────

  startInlineInput(parentPath: string, type: "file" | "folder", depth: number): void {
    this.state.inlineInput = { parentPath, type, depth };
    if (!this.state.expandedPaths.has(parentPath)) {
      this.state.expandedPaths.add(parentPath);
      this.updateExpanded(this.state.tree);
    }
    this.notify();
  }

  cancelInlineInput(): void {
    this.state.inlineInput = null;
    this.notify();
  }

  confirmInlineInput(name: string): void {
    const input = this.state.inlineInput;
    if (!input || !name.trim()) {
      this.cancelInlineInput();
      return;
    }
    const fullPath = input.parentPath ? `${input.parentPath}/${name.trim()}` : name.trim();
    this.state.inlineInput = null;
    if (input.type === "folder") {
      this.createFolder(fullPath);
    } else {
      this.createFile(fullPath);
    }
  }

  // ── Rename mode ─────────────────────────────────────────

  startRename(path: string): void {
    this.state.renaming = path;
    this.notify();
  }

  cancelRename(): void {
    this.state.renaming = null;
    this.notify();
  }

  confirmRename(newName: string): void {
    const oldPath = this.state.renaming;
    if (!oldPath || !newName.trim()) {
      this.cancelRename();
      return;
    }
    const parentDir = oldPath.includes("/") ? oldPath.slice(0, oldPath.lastIndexOf("/")) : "";
    const newPath = parentDir ? `${parentDir}/${newName.trim()}` : newName.trim();
    this.renameItem(oldPath, newPath);
  }

  // ── Event wiring ────────────────────────────────────────

  private wireEvents(): void {
    const onCreated = (p: unknown) => {
      const { uri } = p as { uri: string };
      if (uri) this.debouncedBuildTree();
    };
    const onDeleted = (p: unknown) => {
      const { uri } = p as { uri: string };
      if (uri) {
        this.state.openFileUris.delete(uri);
        this.state.modifiedFileUris.delete(uri);
        if (this.state.activeFileUri === uri) this.state.activeFileUri = null;
        this.debouncedBuildTree();
      }
    };
    const onRenamed = (p: unknown) => {
      const { oldUri, newUri } = p as { oldUri: string; newUri: string };
      if (this.state.activeFileUri === oldUri) this.state.activeFileUri = newUri;
      this.buildTree();
    };
    const onFileOpen = (p: unknown) => {
      const { uri } = p as { uri: string };
      if (uri) this.setActiveFile(uri);
    };
    const onTabSwitch = (p: unknown) => {
      const { uri } = p as { uri: string };
      if (uri) this.setActiveFile(uri);
    };
    const onFileModified = (p: unknown) => {
      const { uri } = p as { uri: string };
      if (uri) this.markModified(uri);
    };
    const onFileSaved = (p: unknown) => {
      const { uri } = p as { uri: string };
      if (uri) this.markSaved(uri);
    };

    this.eventBus.on(FileEvents.Created, onCreated);
    this.eventBus.on(FileEvents.Deleted, onDeleted);
    this.eventBus.on(FileEvents.Renamed, onRenamed);
    this.eventBus.on(FileEvents.Open, onFileOpen);
    this.eventBus.on("tab:switch", onTabSwitch);
    this.eventBus.on(FileEvents.Modified, onFileModified);
    this.eventBus.on(FileEvents.Saved, onFileSaved);

    this.disposers.push(
      () => this.eventBus.off(FileEvents.Created, onCreated),
      () => this.eventBus.off(FileEvents.Deleted, onDeleted),
      () => this.eventBus.off(FileEvents.Renamed, onRenamed),
      () => this.eventBus.off(FileEvents.Open, onFileOpen),
      () => this.eventBus.off("tab:switch", onTabSwitch),
      () => this.eventBus.off(FileEvents.Modified, onFileModified),
      () => this.eventBus.off(FileEvents.Saved, onFileSaved),
    );
  }

  // ── Notify subscribers ──────────────────────────────────

  private notify(): void {
    for (const listener of this.listeners) {
      try { listener(); } catch (e) { console.warn("[ExplorerService] listener error:", e); }
    }
  }

  dispose(): void {
    if (this.rebuildTimer) clearTimeout(this.rebuildTimer);
    for (const d of this.disposers) d();
    this.listeners.clear();
  }

  private debouncedBuildTree(): void {
    if (this.rebuildTimer) clearTimeout(this.rebuildTimer);
    this.rebuildTimer = setTimeout(() => this.buildTree(), 50);
  }
}
