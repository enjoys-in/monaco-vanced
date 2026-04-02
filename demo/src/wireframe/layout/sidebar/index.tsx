// ── Sidebar: multi-view panels — pure React ──────────────────

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { SidebarEvents } from "@enjoys/monaco-vanced/core/events";
import type { DOMRefs, WireframeAPIs, OnHandler, VirtualFile } from "../../types";
import { C } from "../../types";
import { el } from "../../utils";
import type { MockFsAPI } from "../../../mock-fs";
import type { ExplorerIconAPI } from "../../../explorer";
import { VIEW_TITLES } from "./types";
import { createRoot, type Root } from "react-dom/client";
import { ThemeProvider } from "../../../components/theme";
import { SidebarViews } from "../../../components/sidebar";

export interface SidebarExtras {
  iconApi?: ExplorerIconAPI;
  extensionApi?: import("@enjoys/monaco-vanced/extensions/extension-module").ExtensionModuleAPI;
  vsixApi?: import("@enjoys/monaco-vanced/extensions/vsix-module").VSIXModuleAPI;
  authApi?: import("@enjoys/monaco-vanced/infrastructure/auth-module").AuthModuleAPI;
  marketplaceApi?: import("@enjoys/monaco-vanced/extensions/marketplace-module").MarketplaceModuleAPI;
  aiApi?: { chat(messages: { role: string; content: string }[], opts?: Record<string, unknown>): Promise<{ content: string; metadata?: Record<string, unknown> }>; abort(): void; getStatus(): string };
  indexerApi?: { query(q: { query: string; kind?: string; path?: string }): { name: string; kind: string; path: string; line: number; column: number }[]; getFileSymbols(path: string): { name: string; kind: string; path: string; line: number; column: number }[]; isReady(): boolean };
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
  let sidebarRoot: Root | null = null;

  // ── Mount React sidebar views (pure JSX) ───────────────
  function mountSidebarViews() {
    dom.sidebarContent.innerHTML = "";
    if (!sidebarRoot) {
      sidebarRoot = createRoot(dom.sidebarContent);
    }
    sidebarRoot.render(
      <ThemeProvider eventBus={eventBus}>
        <SidebarViews
          eventBus={eventBus}
          files={files}
          notificationApi={apis.notification}
          extensionApi={extras?.extensionApi}
          vsixApi={extras?.vsixApi}
          marketplaceApi={extras?.marketplaceApi}
          indexerApi={extras?.indexerApi}
          mockFs={mockFs}
          iconApi={extras?.iconApi}
        />
      </ThemeProvider>,
    );
  }

  function switchView(viewId: string) {
    activeViewId = viewId;
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
      const explorerApi = (window as any).__explorerApi;
      if (viewId === "explorer" && explorerApi) {
        if (title === "New File") explorerApi.newFile();
        else if (title === "New Folder") explorerApi.newFolder();
        else if (title === "Refresh") explorerApi.refresh();
        else if (title === "Collapse All") explorerApi.collapseAll();
      } else if (viewId === "search" && title === "Clear Results") {
        const searchInput = dom.sidebarContent.querySelector("input[type='text']") as HTMLInputElement | null;
        if (searchInput) { searchInput.value = ""; searchInput.dispatchEvent(new Event("input", { bubbles: true })); }
      }
    });
    return btn;
  }

  // ═══════════════════════════════════════════════════════════
  // ── Initialize ─────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════

  mountSidebarViews();
  dom.sidebarHeader.textContent = VIEW_TITLES[activeViewId];
  updateToolbar(activeViewId);

  on(SidebarEvents.ViewActivate, (p) => { const { viewId } = p as { viewId: string }; switchView(viewId); });
  on(SidebarEvents.Resize, (p) => { const { width } = p as { width: number }; dom.sidebarContainer.style.width = `${width}px`; });
}

export function wireResizeHandle(dom: DOMRefs) {
  const handle = el("div", { style: `position:absolute;right:-2px;top:0;bottom:0;width:4px;cursor:col-resize;z-index:5;` });
  dom.sidebarContainer.appendChild(handle);
  let dragging = false, startX = 0, startW = 0;
  handle.addEventListener("mousedown", (e) => { dragging = true; startX = e.clientX; startW = dom.sidebarContainer.offsetWidth; document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; });
  document.addEventListener("mousemove", (e) => { if (!dragging) return; dom.sidebarContainer.style.width = `${Math.max(170, Math.min(600, startW + (e.clientX - startX)))}px`; });
  document.addEventListener("mouseup", () => { if (!dragging) return; dragging = false; document.body.style.cursor = ""; document.body.style.userSelect = ""; });
}
