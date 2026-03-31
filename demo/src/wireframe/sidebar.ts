// ── Sidebar: Explorer tree + resize handle ──────────────────

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { SidebarEvents, FileEvents } from "@enjoys/monaco-vanced/core/events";
import type { DOMRefs, WireframeAPIs, OnHandler, VirtualFile } from "./types";
import { C } from "./types";
import { el, fileIconSvg, getExt } from "./utils";

// ── Explorer tree node type ─────────────────────────────────
interface TreeNode {
  name: string;
  uri?: string;
  children?: TreeNode[];
  expanded?: boolean;
}

export function wireSidebar(
  dom: DOMRefs,
  apis: WireframeAPIs,
  eventBus: EventBus,
  on: OnHandler,
  files: VirtualFile[],
) {
  let activeFileUri: string | null = null;

  // Build tree from flat file list
  function buildTree(fileList: VirtualFile[]): TreeNode[] {
    const root: TreeNode = { name: "", children: [] };
    for (const f of fileList) {
      const parts = f.uri.split("/");
      let node = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          node.children!.push({ name: part, uri: f.uri });
        } else {
          let child = node.children!.find((c) => c.name === part && c.children);
          if (!child) {
            child = { name: part, children: [], expanded: true };
            node.children!.push(child);
          }
          node = child;
        }
      }
    }
    return root.children ?? [];
  }

  function renderTree(nodes: TreeNode[], depth = 0): DocumentFragment {
    const frag = document.createDocumentFragment();
    // Sort: folders first, then files, both alphabetical
    const sorted = [...nodes].sort((a, b) => {
      if (a.children && !b.children) return -1;
      if (!a.children && b.children) return 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of sorted) {
      if (node.children) {
        // Folder
        const folder = renderFolder(node, depth);
        frag.appendChild(folder);
      } else {
        // File
        const file = renderFile(node, depth);
        frag.appendChild(file);
      }
    }
    return frag;
  }

  function renderFolder(node: TreeNode, depth: number): HTMLElement {
    const wrapper = el("div");
    const row = el("div", {
      class: "vsc-file-item",
      style: `display:flex;align-items:center;height:22px;padding-left:${8 + depth * 16}px;cursor:pointer;user-select:none;`,
    });
    const chevron = el("span", {
      style: `display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;transition:transform .1s;transform:rotate(${node.expanded ? "90deg" : "0"});color:${C.fgDim};font-size:10px;`,
    });
    chevron.innerHTML = `<svg width="10" height="10" viewBox="0 0 16 16"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;

    const folderIcon = el("span", { style: "margin-right:4px;display:inline-flex;align-items:center;color:#dcb67a;" });
    folderIcon.innerHTML = node.expanded
      ? `<svg width="16" height="16" viewBox="0 0 16 16" fill="#dcb67a"><path d="M1.5 14h13l.5-.5v-7l-.5-.5H8l-1-2H1.5L1 4.5v9l.5.5zM2 5h4.5l1 2H14v6H2V5z"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 16 16" fill="#dcb67a"><path d="M14.5 3H7.71l-.85-.85L6.51 2h-5l-.5.5v11l.5.5h13l.5-.5v-10L14.5 3zm-.51 8.49V13H2V3h4.29l.85.85.36.15h6.49v7.49z"/></svg>`;

    const label = el("span", { style: `color:${C.fg};font-size:13px;` }, node.name);
    row.append(chevron, folderIcon, label);

    const childContainer = el("div", { style: node.expanded ? "" : "display:none;" });
    childContainer.appendChild(renderTree(node.children ?? [], depth + 1));

    row.addEventListener("click", () => {
      node.expanded = !node.expanded;
      chevron.style.transform = `rotate(${node.expanded ? "90deg" : "0"})`;
      childContainer.style.display = node.expanded ? "" : "none";
      folderIcon.innerHTML = node.expanded
        ? `<svg width="16" height="16" viewBox="0 0 16 16" fill="#dcb67a"><path d="M1.5 14h13l.5-.5v-7l-.5-.5H8l-1-2H1.5L1 4.5v9l.5.5zM2 5h4.5l1 2H14v6H2V5z"/></svg>`
        : `<svg width="16" height="16" viewBox="0 0 16 16" fill="#dcb67a"><path d="M14.5 3H7.71l-.85-.85L6.51 2h-5l-.5.5v11l.5.5h13l.5-.5v-10L14.5 3zm-.51 8.49V13H2V3h4.29l.85.85.36.15h6.49v7.49z"/></svg>`;
    });

    wrapper.append(row, childContainer);
    return wrapper;
  }

  function renderFile(node: TreeNode, depth: number): HTMLElement {
    const ext = getExt(node.name);
    const row = el("div", {
      class: "vsc-file-item",
      "data-uri": node.uri ?? "",
      style: `display:flex;align-items:center;height:22px;padding-left:${24 + depth * 16}px;cursor:pointer;user-select:none;`,
    });
    const icon = el("span", { style: "margin-right:6px;display:inline-flex;align-items:center;" });
    icon.innerHTML = fileIconSvg(ext);
    const label = el("span", { style: `color:${C.fg};font-size:13px;` }, node.name);
    row.append(icon, label);

    row.addEventListener("click", () => {
      if (node.uri) eventBus.emit(FileEvents.Open, { uri: node.uri, label: node.name });
    });

    return row;
  }

  function setActiveFile(uri: string) {
    activeFileUri = uri;
    dom.sidebarContent.querySelectorAll(".vsc-file-item").forEach((el) => {
      const item = el as HTMLElement;
      item.dataset.active = item.dataset.uri === uri ? "true" : "false";
    });
  }

  // Populate the explorer
  const tree = buildTree(files);
  const projectNode: TreeNode = { name: "MONACO-VANCED", children: tree, expanded: true };
  dom.sidebarContent.innerHTML = "";
  dom.sidebarContent.appendChild(renderTree([projectNode], 0));

  // Wire events
  on(SidebarEvents.ViewActivate, (p) => {
    const { viewId } = p as { viewId: string };
    dom.sidebarHeader.textContent = viewId === "explorer" ? "Explorer" : viewId;
  });

  on(SidebarEvents.Resize, (p) => {
    const { width } = p as { width: number };
    dom.sidebarContainer.style.width = `${width}px`;
  });

  on(FileEvents.Open, (p) => {
    const { uri } = p as { uri: string };
    setActiveFile(uri);
  });

  on("tab:switch", (p) => {
    const { uri } = p as { uri: string };
    setActiveFile(uri);
  });
}

export function wireResizeHandle(dom: DOMRefs) {
  const handle = el("div", {
    style: `position:absolute;right:-2px;top:0;bottom:0;width:4px;cursor:col-resize;z-index:5;`,
  });
  dom.sidebarContainer.appendChild(handle);

  let dragging = false;
  let startX = 0;
  let startW = 0;

  handle.addEventListener("mousedown", (e) => {
    dragging = true;
    startX = e.clientX;
    startW = dom.sidebarContainer.offsetWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const newW = Math.max(170, Math.min(600, startW + (e.clientX - startX)));
    dom.sidebarContainer.style.width = `${newW}px`;
  });

  document.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });
}
