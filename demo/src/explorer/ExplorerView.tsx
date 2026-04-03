// ── Explorer View (React) — main file explorer component ─────
// Replaces Explorer.ts class with pure React + state hooks.
// Reuses ExplorerService (state management) and ExplorerTypes.

import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "../components/theme";
import { ExplorerAction, PanelEvents, SettingsEvents, ThemeEvents, AiEvents, PreviewEvents } from "@enjoys/monaco-vanced/core/events";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { MockFsAPI } from "../mock-fs";
import { ExplorerService } from "./ExplorerService";
import type { TreeNode, ExplorerState, InlineInputState } from "./ExplorerTypes";
import { ExplorerTreeView } from "./ExplorerTreeView";
import { ExplorerContextMenuView } from "./ExplorerContextMenuView";

export interface ExplorerIconAPI {
  getFileIcon(filename: string, isDirectory?: boolean, isOpen?: boolean): string;
}

interface Props {
  fs: MockFsAPI;
  eventBus: InstanceType<typeof EventBus>;
  rootLabel?: string;
  onNotify?: (message: string, type?: string) => void;
  iconApi?: ExplorerIconAPI;
}

export function ExplorerView({ fs, eventBus, rootLabel = "MONACO-VANCED", onNotify, iconApi }: Props) {
  const { tokens: t } = useTheme();
  const serviceRef = useRef<ExplorerService | null>(null);
  const [state, setState] = useState<ExplorerState | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: TreeNode } | null>(null);

  // Initialize service once
  useEffect(() => {
    const svc = new ExplorerService(fs, eventBus, rootLabel);
    serviceRef.current = svc;
    setState({ ...svc.getState() });
    const unsub = svc.subscribe(() => setState({ ...svc.getState() }));
    return () => { unsub(); svc.dispose(); serviceRef.current = null; };
  }, [fs, eventBus, rootLabel]);

  // Re-render on settings/theme changes
  useEffect(() => {
    const onSettings = (p: unknown) => {
      const payload = p as { id?: string; key?: string };
      const key = payload.id ?? payload.key ?? "";
      if (["explorer.sortOrder", "explorer.compactFolders", "files.exclude", "explorer.showHiddenFiles"].includes(key)) {
        setState(s => s ? { ...s } : s);
      }
    };
    const onTheme = () => setState(s => s ? { ...s } : s);
    eventBus.on(SettingsEvents.Change, onSettings);
    eventBus.on(ThemeEvents.Changed, onTheme);
    return () => { eventBus.off(SettingsEvents.Change, onSettings); eventBus.off(ThemeEvents.Changed, onTheme); };
  }, [eventBus]);

  const svc = serviceRef.current;

  // ── Callbacks ──────────────────────────────────────────
  const onFileClick = useCallback((path: string) => {
    svc?.setSelectedPath(path);
    svc?.openFile(path);
  }, [svc]);

  const onFolderToggle = useCallback((path: string) => {
    svc?.setSelectedPath(path);
    svc?.toggleFolder(path);
  }, [svc]);

  const onContextMenu = useCallback((e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    svc?.setSelectedPath(node.path);
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, [svc]);

  const onRenameConfirm = useCallback((name: string) => { svc?.confirmRename(name); }, [svc]);
  const onRenameCancel = useCallback(() => { svc?.cancelRename(); }, [svc]);
  const onInlineConfirm = useCallback((name: string) => { svc?.confirmInlineInput(name); }, [svc]);
  const onInlineCancel = useCallback(() => { svc?.cancelInlineInput(); }, [svc]);

  // ── Context menu action handler ────────────────────────
  const handleContextAction = useCallback((action: ExplorerAction, node: TreeNode) => {
    setContextMenu(null);
    if (!svc) return;
    const getDepth = (p: string) => p ? p.split("/").length : 0;

    switch (action) {
      case ExplorerAction.Open:
        if (!node.isDirectory) svc.openFile(node.path); break;
      case ExplorerAction.OpenSide:
        if (!node.isDirectory) svc.openFileSide(node.path); break;
      case ExplorerAction.NewFile:
        svc.startInlineInput(node.path, "file", getDepth(node.path) + 1); break;
      case ExplorerAction.NewFolder:
        svc.startInlineInput(node.path, "folder", getDepth(node.path) + 1); break;
      case ExplorerAction.Rename:
        svc.startRename(node.path); break;
      case ExplorerAction.Delete:
        svc.deleteItem(node.path);
        onNotify?.(`Deleted ${node.name}`, "info"); break;
      case ExplorerAction.CopyPath:
      case ExplorerAction.CopyRelativePath:
        svc.copyPath(node.path);
        onNotify?.("Copied path to clipboard", "info"); break;
      case ExplorerAction.CopyContent:
        if (!node.isDirectory) {
          const content = fs.readFile(node.path);
          if (content != null) {
            navigator.clipboard.writeText(content).catch(() => {});
            onNotify?.("Copied file content to clipboard", "info");
          }
        } break;
      case ExplorerAction.Duplicate:
        if (!node.isDirectory) {
          const ext = node.name.includes(".") ? node.name.slice(node.name.lastIndexOf(".")) : "";
          const base = node.name.includes(".") ? node.name.slice(0, node.name.lastIndexOf(".")) : node.name;
          const parent = node.path.includes("/") ? node.path.slice(0, node.path.lastIndexOf("/")) : "";
          const dupPath = parent ? `${parent}/${base}-copy${ext}` : `${base}-copy${ext}`;
          svc.createFile(dupPath, fs.readFile(node.path) ?? "");
          onNotify?.(`Duplicated as ${base}-copy${ext}`, "info");
        } break;
      case ExplorerAction.CollapseFolder:
        if (node.isDirectory) svc.toggleFolder(node.path); break;
      case ExplorerAction.OpenInTerminal: {
        const dir = node.isDirectory ? node.path : (node.path.includes("/") ? node.path.slice(0, node.path.lastIndexOf("/")) : "");
        eventBus.emit(PanelEvents.BottomToggle, {});
        eventBus.emit(PanelEvents.BottomFocusTab, { tab: "Terminal", cwd: dir || "." });
      } break;
      case ExplorerAction.AddFileToChat:
        if (!node.isDirectory) {
          eventBus.emit(AiEvents.AttachFile, { uri: node.path, name: node.name });
          eventBus.emit(AiEvents.OpenChat, {});
        } break;
      case ExplorerAction.AddFolderToChat:
        if (node.isDirectory) {
          eventBus.emit(AiEvents.AttachFolder, { uri: node.path, name: node.name });
          eventBus.emit(AiEvents.OpenChat, {});
        } break;
      case ExplorerAction.Preview:
        if (!node.isDirectory) {
          eventBus.emit(PreviewEvents.OpenRequest, { uri: node.path, label: node.name });
        } break;
    }
  }, [svc, fs, eventBus, onNotify]);

  // ── Toolbar API ────────────────────────────────────────
  // Expose imperative methods for the sidebar toolbar
  const resolveNewItemParent = useCallback((): string => {
    if (!svc) return "";
    const st = svc.getState();
    const selected = st.selectedPath;
    if (!selected) return "";
    const stat = fs.stat(selected);
    if (stat && stat.type === "directory") return selected;
    const i = selected.lastIndexOf("/");
    return i >= 0 ? selected.slice(0, i) : "";
  }, [svc, fs]);

  // Expose for toolbar buttons
  window.__explorerApi = {
    newFile: () => { const p = resolveNewItemParent(); svc?.startInlineInput(p, "file", p ? p.split("/").length + 1 : 1); },
    newFolder: () => { const p = resolveNewItemParent(); svc?.startInlineInput(p, "folder", p ? p.split("/").length + 1 : 1); },
    collapseAll: () => svc?.collapseAll(),
    refresh: () => svc?.buildTree(),
  };

  if (!state) return null;

  return (
    <div style={{ overflowY: "auto", overflowX: "hidden", height: "100%" }} className="explorer-root">
      {/* Root label */}
      <div style={{
        display: "flex", alignItems: "center", height: 22, padding: "0 8px",
        fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
        color: t.fgDim, textTransform: "uppercase", userSelect: "none",
      }}>
        {state.rootLabel}
      </div>

      {/* Tree */}
      <ExplorerTreeView
        nodes={state.tree}
        state={state}
        depth={1}
        parentPath=""
        iconApi={iconApi}
        onFileClick={onFileClick}
        onFolderToggle={onFolderToggle}
        onContextMenu={onContextMenu}
        onRenameConfirm={onRenameConfirm}
        onRenameCancel={onRenameCancel}
        onInlineConfirm={onInlineConfirm}
        onInlineCancel={onInlineCancel}
      />

      {/* Context Menu */}
      {contextMenu && (
        <ExplorerContextMenuView
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onAction={handleContextAction}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
