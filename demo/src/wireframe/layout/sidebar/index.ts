// ── Sidebar: multi-view panels — modernized VS Code style ──

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { SidebarEvents, FileEvents, TabEvents } from "@enjoys/monaco-vanced/core/events";
import type { DOMRefs, WireframeAPIs, OnHandler, VirtualFile } from "../../types";
import { C } from "../../types";
import { el, fileIconSvg, getExt } from "../../utils";
import type { MockFsAPI } from "../../../mock-fs";
import { Explorer } from "../../../explorer";
import type { ExplorerIconAPI } from "../../../explorer";
import { VIEW_TITLES } from "./types";
import type { ViewContext } from "./types";
import { buildSearchView } from "./search-view";
import { buildScmView } from "./scm-view";
import { buildDebugView } from "./debug-view";
import { buildExtensionsView } from "./extensions-view";
import { buildAccountsView } from "./accounts-view";
import { buildSettingsRedirect } from "./settings-view";

export interface SidebarExtras {
  iconApi?: ExplorerIconAPI;
  extensionApi?: import("@enjoys/monaco-vanced/extensions/extension-module").ExtensionModuleAPI;
  vsixApi?: import("@enjoys/monaco-vanced/extensions/vsix-module").VSIXModuleAPI;
  authApi?: import("@enjoys/monaco-vanced/infrastructure/auth-module").AuthModuleAPI;
  marketplaceApi?: import("@enjoys/monaco-vanced/extensions/marketplace-module").MarketplaceModuleAPI;
}

export function wireSidebar(
  dom: DOMRefs,
  apis: WireframeAPIs,
  eventBus: InstanceType<typeof EventBus>,
  on: OnHandler,
  files: VirtualFile[],
  mockFs?: MockFsAPI,
  extras?: SidebarExtras,
) {
  let activeViewId = "explorer";
  const viewContainers: Record<string, HTMLElement> = {};
  const ctx: ViewContext = { files, apis, eventBus, iconApi: extras?.iconApi, extensionApi: extras?.extensionApi, vsixApi: extras?.vsixApi, authApi: extras?.authApi, marketplaceApi: extras?.marketplaceApi };

  // ── Explorer instance (if mockFs is provided) ──────────
  let explorer: Explorer | null = null;
  if (mockFs) {
    explorer = new Explorer({
      fs: mockFs,
      eventBus,
      rootLabel: "MONACO-VANCED",
      onNotify: (message, type) => apis.notification?.show({ type: type as "info" | "success" ?? "info", message, duration: 3000 }),
      iconApi: extras?.iconApi,
    });
  }

  function createViews() {
    viewContainers.explorer = explorer ? explorer.getElement() : buildFallbackExplorerView(files);
    viewContainers.search = buildSearchView(ctx);
    viewContainers.scm = buildScmView(ctx);
    viewContainers.debug = buildDebugView(ctx);
    viewContainers.extensions = buildExtensionsView(ctx);
    viewContainers.accounts = buildAccountsView(ctx);
    viewContainers["settings-gear"] = buildSettingsRedirect(ctx);
    for (const [id, container] of Object.entries(viewContainers)) {
      container.style.display = id === activeViewId ? "" : "none";
      container.dataset.viewId = id;
      dom.sidebarContent.appendChild(container);
    }
  }

  function switchView(viewId: string) {
    activeViewId = viewId;
    for (const [id, container] of Object.entries(viewContainers)) {
      container.style.display = id === viewId ? "" : "none";
    }
    dom.sidebarHeader.textContent = VIEW_TITLES[viewId] ?? viewId;
    updateToolbar(viewId);
  }

  function updateToolbar(viewId: string) {
    dom.sidebarToolbar.innerHTML = "";
    const toolbarDefs: Record<string, { title: string; svg: string }[]> = {
      explorer: [
        { title: "New File", svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M12 3H8.5L7 1.5 6.5 1H2l-.5.5v12l.5.5h10l.5-.5V3.5L12 3zm-.5 9.5h-9v-11H6v2.5l.5.5H11.5v8zM7 3.5V2l3.5 3.5H8L7.5 5V3.5z"/></svg>` },
        { title: "New Folder", svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M14 4H9l-1-2H2L1 3v10l1 1h12l1-1V5l-1-1zm0 9H2V3h5.5l1 2H14v8z"/></svg>` },
        { title: "Refresh", svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.45 5.78a6 6 0 10.87 4.22h-1.07a5 5 0 11-.72-3.53L11 8h4V4l-1.55 1.78z"/></svg>` },
        { title: "Collapse All", svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M9 9H4v1h5V9zM9 4H4v1h5V4z"/><path d="M1 2.5l.5-.5h12l.5.5v10l-.5.5h-12l-.5-.5v-10zm1 0v10h12v-10H2z"/></svg>` },
      ],
      search: [
        { title: "Clear Results", svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8.707l3.646 3.647.708-.708L8.707 8l3.647-3.646-.708-.708L8 7.293 4.354 3.646l-.708.708L7.293 8l-3.647 3.646.708.708L8 8.707z"/></svg>` },
      ],
      extensions: [
        { title: "Filter", svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6 12v-1h4v1H6zM4 7h8v1H4V7zm-2-4v1h12V3H2z"/></svg>` },
      ],
    };
    for (const { title, svg } of toolbarDefs[viewId] ?? []) {
      dom.sidebarToolbar.appendChild(makeToolbarBtn(title, svg, viewId));
    }
  }

  function makeToolbarBtn(title: string, svg: string, viewId: string): HTMLElement {
    const btn = el("div", {
      title,
      style: `width:22px;height:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:4px;color:${C.fgDim};transition:all .12s;`,
    });
    btn.innerHTML = svg;
    btn.addEventListener("mouseenter", () => { btn.style.background = "rgba(255,255,255,0.08)"; btn.style.color = C.fg; });
    btn.addEventListener("mouseleave", () => { btn.style.background = "transparent"; btn.style.color = C.fgDim; });
    btn.addEventListener("click", () => {
      if (viewId === "explorer") {
        if (explorer) {
          if (title === "New File") explorer.newFile();
          else if (title === "New Folder") explorer.newFolder();
          else if (title === "Refresh") explorer.refresh();
          else if (title === "Collapse All") explorer.collapseAll();
        } else {
          if (title === "New File") promptNewFile();
          else if (title === "New Folder") promptNewFolder();
          else if (title === "Collapse All") collapseAllFolders();
        }
      } else if (viewId === "search" && title === "Clear Results") {
        const searchInput = viewContainers.search?.querySelector("input") as HTMLInputElement | null;
        if (searchInput) { searchInput.value = ""; searchInput.dispatchEvent(new Event("input")); }
      }
    });
    return btn;
  }

  function promptNewFile() {
    const name = prompt("Enter file name (e.g. src/utils.ts):");
    if (!name?.trim()) return;
    const path = name.trim();
    const fileName = path.split("/").pop() ?? path;
    const ext = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : "";
    const langMap: Record<string, string> = { ts: "typescript", tsx: "typescriptreact", js: "javascript", jsx: "javascriptreact", json: "json", css: "css", html: "html", md: "markdown" };
    const newFile: VirtualFile = { uri: path, name: fileName, language: langMap[ext] ?? "plaintext", content: "" };
    files.push(newFile);
    rebuildFallbackExplorer();
    eventBus.emit(FileEvents.Open, { uri: path, label: fileName });
    apis.notification?.show({ type: "success", message: `Created ${path}`, duration: 3000 });
  }

  function promptNewFolder() {
    const name = prompt("Enter folder path (e.g. src/components):");
    if (!name?.trim()) return;
    const placeholder = name.trim() + "/.gitkeep";
    files.push({ uri: placeholder, name: ".gitkeep", language: "plaintext", content: "" });
    rebuildFallbackExplorer();
    apis.notification?.show({ type: "success", message: `Created folder ${name.trim()}`, duration: 3000 });
  }

  function collapseAllFolders() {
    const explorerEl = viewContainers.explorer;
    if (!explorerEl) return;
    explorerEl.querySelectorAll("[style*='transform: rotate(90deg)']").forEach((chevron) => {
      (chevron as HTMLElement).click();
    });
  }

  function rebuildFallbackExplorer() {
    const old = viewContainers.explorer;
    viewContainers.explorer = buildFallbackExplorerView(files);
    viewContainers.explorer.dataset.viewId = "explorer";
    viewContainers.explorer.style.display = activeViewId === "explorer" ? "" : "none";
    if (old?.parentNode) old.parentNode.replaceChild(viewContainers.explorer, old);
  }

  // ═══════════════════════════════════════════════════════════
  // ── Fallback Explorer (used when no MockFsAPI provided) ────
  // ═══════════════════════════════════════════════════════════

  interface FallbackTreeNode {
    name: string;
    uri?: string;
    children?: FallbackTreeNode[];
    expanded?: boolean;
  }

  function buildFallbackExplorerView(fileList: VirtualFile[]): HTMLElement {
    const container = el("div", { style: "overflow-y:auto;overflow-x:hidden;height:100%;" });
    const tree = buildFallbackTree(fileList);
    const projectNode: FallbackTreeNode = { name: "MONACO-VANCED", children: tree, expanded: true };
    container.appendChild(renderFallbackTree([projectNode], 0));
    return container;
  }

  function buildFallbackTree(fileList: VirtualFile[]): FallbackTreeNode[] {
    const root: FallbackTreeNode = { name: "", children: [] };
    for (const f of fileList) {
      const parts = f.uri.split("/");
      let node = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) { node.children!.push({ name: part, uri: f.uri }); }
        else {
          let child = node.children!.find((c) => c.name === part && c.children);
          if (!child) { child = { name: part, children: [], expanded: true }; node.children!.push(child); }
          node = child;
        }
      }
    }
    return root.children ?? [];
  }

  function renderFallbackTree(nodes: FallbackTreeNode[], depth = 0): DocumentFragment {
    const frag = document.createDocumentFragment();
    const sorted = [...nodes].sort((a, b) => {
      if (a.children && !b.children) return -1;
      if (!a.children && b.children) return 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of sorted) frag.appendChild(node.children ? renderFallbackFolder(node, depth) : renderFallbackFile(node, depth));
    return frag;
  }

  function renderFallbackFolder(node: FallbackTreeNode, depth: number): HTMLElement {
    const wrapper = el("div");
    const row = el("div", { class: "vsc-file-item", style: `display:flex;align-items:center;height:22px;padding-left:${8 + depth * 16}px;cursor:pointer;user-select:none;` });
    const chevron = el("span", { style: `display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;transition:transform .12s ease;transform:rotate(${node.expanded ? "90deg" : "0"});color:${C.fgDim};` });
    chevron.innerHTML = `<svg width="10" height="10" viewBox="0 0 16 16"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
    const folderIcon = el("span", { style: "margin-right:4px;display:inline-flex;align-items:center;color:#dcb67a;" });
    const openSvg = `<svg width="16" height="16" viewBox="0 0 16 16" fill="#dcb67a"><path d="M1.5 14h13l.5-.5v-7l-.5-.5H8l-1-2H1.5L1 4.5v9l.5.5zM2 5h4.5l1 2H14v6H2V5z"/></svg>`;
    const closedSvg = `<svg width="16" height="16" viewBox="0 0 16 16" fill="#dcb67a"><path d="M14.5 3H7.71l-.85-.85L6.51 2h-5l-.5.5v11l.5.5h13l.5-.5v-10L14.5 3zm-.51 8.49V13H2V3h4.29l.85.85.36.15h6.49v7.49z"/></svg>`;
    folderIcon.innerHTML = node.expanded ? openSvg : closedSvg;
    const label = el("span", { style: `color:${C.fg};font-size:13px;` }, node.name);
    row.append(chevron, folderIcon, label);
    const childContainer = el("div", { style: node.expanded ? "" : "display:none;" });
    childContainer.appendChild(renderFallbackTree(node.children ?? [], depth + 1));
    row.addEventListener("click", () => {
      node.expanded = !node.expanded;
      chevron.style.transform = `rotate(${node.expanded ? "90deg" : "0"})`;
      childContainer.style.display = node.expanded ? "" : "none";
      folderIcon.innerHTML = node.expanded ? openSvg : closedSvg;
    });
    wrapper.append(row, childContainer);
    return wrapper;
  }

  function renderFallbackFile(node: FallbackTreeNode, depth: number): HTMLElement {
    const ext = getExt(node.name);
    const row = el("div", { class: "vsc-file-item", "data-uri": node.uri ?? "", style: `display:flex;align-items:center;height:22px;padding-left:${24 + depth * 16}px;cursor:pointer;user-select:none;` });
    const icon = el("span", { style: "margin-right:6px;display:inline-flex;align-items:center;" });
    icon.innerHTML = fileIconSvg(ext);
    const label = el("span", { style: `color:${C.fg};font-size:13px;` }, node.name);
    row.append(icon, label);
    row.addEventListener("click", () => { if (node.uri) eventBus.emit(FileEvents.Open, { uri: node.uri, label: node.name }); });
    return row;
  }

  // ═══════════════════════════════════════════════════════════
  // ── Initialize ─────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════

  dom.sidebarContent.innerHTML = "";
  createViews();
  dom.sidebarHeader.textContent = VIEW_TITLES[activeViewId];
  updateToolbar(activeViewId);

  on(SidebarEvents.ViewActivate, (p) => { const { viewId } = p as { viewId: string }; switchView(viewId); });
  on(SidebarEvents.Resize, (p) => { const { width } = p as { width: number }; dom.sidebarContainer.style.width = `${width}px`; });

  // Active file tracking — new Explorer handles it internally; fallback needs manual highlights
  if (!explorer) {
    const setActiveFile = (uri: string) => {
      const explorerEl = viewContainers.explorer;
      if (!explorerEl) return;
      explorerEl.querySelectorAll(".vsc-file-item").forEach((e) => {
        const item = e as HTMLElement;
        item.dataset.active = item.dataset.uri === uri ? "true" : "false";
      });
    };
    on(FileEvents.Open, (p) => { const { uri } = p as { uri: string }; setActiveFile(uri); });
    on(TabEvents.Switch, (p) => { const { uri } = p as { uri: string }; setActiveFile(uri); });
  }
}

export function wireResizeHandle(dom: DOMRefs) {
  const handle = el("div", { style: `position:absolute;right:-2px;top:0;bottom:0;width:4px;cursor:col-resize;z-index:5;` });
  dom.sidebarContainer.appendChild(handle);
  let dragging = false, startX = 0, startW = 0;
  handle.addEventListener("mousedown", (e) => { dragging = true; startX = e.clientX; startW = dom.sidebarContainer.offsetWidth; document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; });
  document.addEventListener("mousemove", (e) => { if (!dragging) return; dom.sidebarContainer.style.width = `${Math.max(170, Math.min(600, startW + (e.clientX - startX)))}px`; });
  document.addEventListener("mouseup", () => { if (!dragging) return; dragging = false; document.body.style.cursor = ""; document.body.style.userSelect = ""; });
}
