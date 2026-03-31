// ── Sidebar: multi-view panels — modernized VS Code style ──

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

// ── View title mapping ──────────────────────────────────────
const VIEW_TITLES: Record<string, string> = {
  explorer: "Explorer",
  search: "Search",
  scm: "Source Control",
  debug: "Run and Debug",
  extensions: "Extensions",
  accounts: "Accounts",
  "settings-gear": "Settings",
};

// ── Plugin catalog — all 81 modules across 12 categories ────
interface PluginInfo {
  name: string;
  id: string;
  desc: string;
  category: string;
  color: string;
  installed: boolean;
}

const PLUGIN_CATALOG: PluginInfo[] = [
  // Theming (2)
  { name: "Theme Engine", id: "theme-module", desc: "Color theme management & switching", category: "Theming", color: "#ce9178", installed: true },
  { name: "Icon Pack", id: "icon-module", desc: "File & folder icon management", category: "Theming", color: "#dcdcaa", installed: true },
  // Editor (7)
  { name: "Code Editor", id: "editor-module", desc: "Core Monaco editor integration", category: "Editor", color: "#569cd6", installed: true },
  { name: "Tabs Manager", id: "tabs-module", desc: "Multi-file tab management", category: "Editor", color: "#4ec9b0", installed: true },
  { name: "Decorations", id: "decorations-module", desc: "Text decorations & highlights", category: "Editor", color: "#c586c0", installed: false },
  { name: "Preview Pane", id: "preview-module", desc: "Live preview for Markdown & HTML", category: "Editor", color: "#9cdcfe", installed: false },
  { name: "Snippets", id: "snippets-module", desc: "Code snippet management", category: "Editor", color: "#dcdcaa", installed: false },
  { name: "Virtualization", id: "virtualization-module", desc: "Large file virtual scrolling", category: "Editor", color: "#4fc1ff", installed: false },
  { name: "Webview", id: "webview-module", desc: "Embedded webview panels", category: "Editor", color: "#c586c0", installed: false },
  // Layout (8)
  { name: "Layout Manager", id: "layout-module", desc: "Split panes & panel management", category: "Layout", color: "#4ec9b0", installed: true },
  { name: "Header", id: "header-module", desc: "Title bar & menu management", category: "Layout", color: "#9cdcfe", installed: true },
  { name: "Sidebar", id: "sidebar-module", desc: "Sidebar view management", category: "Layout", color: "#ce9178", installed: true },
  { name: "Status Bar", id: "statusbar-module", desc: "Bottom status bar items", category: "Layout", color: "#569cd6", installed: true },
  { name: "Title Bar", id: "title-module", desc: "Window title management", category: "Layout", color: "#dcdcaa", installed: true },
  { name: "Navigation", id: "navigation-module", desc: "Breadcrumbs & go-to navigation", category: "Layout", color: "#c586c0", installed: true },
  { name: "UI Components", id: "ui-module", desc: "Common UI widget primitives", category: "Layout", color: "#4fc1ff", installed: true },
  { name: "Context Menu", id: "context-menu-module", desc: "Right-click context menus", category: "Layout", color: "#9cdcfe", installed: true },
  // Infrastructure (8)
  { name: "Command Palette", id: "command-module", desc: "Command registration & execution", category: "Infrastructure", color: "#569cd6", installed: true },
  { name: "Keybindings", id: "keybinding-module", desc: "Keyboard shortcut management", category: "Infrastructure", color: "#4ec9b0", installed: true },
  { name: "Settings", id: "settings-module", desc: "User & workspace settings", category: "Infrastructure", color: "#dcdcaa", installed: true },
  { name: "Notifications", id: "notification-module", desc: "Toast notification system", category: "Infrastructure", color: "#ce9178", installed: true },
  { name: "Dialogs", id: "dialog-module", desc: "Modal dialog management", category: "Infrastructure", color: "#c586c0", installed: true },
  { name: "Authentication", id: "auth-module", desc: "OAuth & token-based auth", category: "Infrastructure", color: "#4fc1ff", installed: false },
  { name: "Deep Links", id: "deep-link-module", desc: "URL deep linking support", category: "Infrastructure", color: "#9cdcfe", installed: false },
  { name: "Storage", id: "storage-module", desc: "Persistent key-value storage", category: "Infrastructure", color: "#569cd6", installed: false },
  // AI / Intelligence (10)
  { name: "AI Assistant", id: "ai-module", desc: "AI code completion & chat", category: "AI / Intelligence", color: "#b5cea8", installed: false },
  { name: "AI Agent", id: "agent-module", desc: "Autonomous coding agents", category: "AI / Intelligence", color: "#4ec9b0", installed: false },
  { name: "AI Memory", id: "ai-memory-module", desc: "AI conversation persistence", category: "AI / Intelligence", color: "#9cdcfe", installed: false },
  { name: "Context Fusion", id: "context-fusion-module", desc: "Multi-source context blending", category: "AI / Intelligence", color: "#c586c0", installed: false },
  { name: "Eval Engine", id: "eval-module", desc: "AI model evaluation framework", category: "AI / Intelligence", color: "#ce9178", installed: false },
  { name: "Intent Detection", id: "intent-module", desc: "User intent recognition", category: "AI / Intelligence", color: "#dcdcaa", installed: false },
  { name: "Knowledge Graph", id: "knowledge-graph-module", desc: "Semantic code knowledge graph", category: "AI / Intelligence", color: "#569cd6", installed: false },
  { name: "Memory Store", id: "memory-module", desc: "Long-term memory management", category: "AI / Intelligence", color: "#4fc1ff", installed: false },
  { name: "Predictive", id: "predictive-module", desc: "Predictive code actions", category: "AI / Intelligence", color: "#b5cea8", installed: false },
  { name: "RAG Engine", id: "rag-module", desc: "Retrieval-augmented generation", category: "AI / Intelligence", color: "#4ec9b0", installed: false },
  // Devtools (6)
  { name: "Debugger", id: "debugger-module", desc: "Breakpoints & step debugging", category: "Devtools", color: "#f14c4c", installed: false },
  { name: "Notebook", id: "notebook-module", desc: "Jupyter-style notebooks", category: "Devtools", color: "#dcdcaa", installed: false },
  { name: "Profiler", id: "profiler-module", desc: "Performance profiling tools", category: "Devtools", color: "#ce9178", installed: false },
  { name: "Task Runner", id: "task-module", desc: "Build & script task management", category: "Devtools", color: "#4ec9b0", installed: false },
  { name: "Terminal", id: "terminal-module", desc: "Integrated terminal emulation", category: "Devtools", color: "#89d185", installed: false },
  { name: "Test Runner", id: "test-module", desc: "Unit & integration test execution", category: "Devtools", color: "#569cd6", installed: false },
  // Enterprise (9)
  { name: "API Stability", id: "api-stability-module", desc: "API versioning & deprecation", category: "Enterprise", color: "#4fc1ff", installed: false },
  { name: "Audit Trail", id: "audit-module", desc: "User action audit logging", category: "Enterprise", color: "#ce9178", installed: false },
  { name: "Billing", id: "billing-module", desc: "Usage metering & billing", category: "Enterprise", color: "#b5cea8", installed: false },
  { name: "Context Engine", id: "context-engine", desc: "Workspace context aggregation", category: "Enterprise", color: "#9cdcfe", installed: false },
  { name: "Policy Engine", id: "policy-module", desc: "Security & compliance policies", category: "Enterprise", color: "#f14c4c", installed: false },
  { name: "Realtime", id: "realtime-module", desc: "WebSocket realtime channels", category: "Enterprise", color: "#c586c0", installed: false },
  { name: "SaaS Tenant", id: "saas-tenant-module", desc: "Multi-tenant SaaS support", category: "Enterprise", color: "#dcdcaa", installed: false },
  { name: "Secrets Vault", id: "secrets-module", desc: "Secure secret management", category: "Enterprise", color: "#f14c4c", installed: false },
  { name: "Telemetry", id: "telemetry-module", desc: "Usage analytics & metrics", category: "Enterprise", color: "#4ec9b0", installed: false },
  // Extensions (4)
  { name: "Extension Host", id: "extension-module", desc: "Extension lifecycle & API host", category: "Extensions", color: "#569cd6", installed: false },
  { name: "Marketplace", id: "marketplace-module", desc: "Extension marketplace browser", category: "Extensions", color: "#ce9178", installed: false },
  { name: "Embed", id: "embed-module", desc: "Embeddable editor widgets", category: "Extensions", color: "#dcdcaa", installed: false },
  { name: "VSIX Loader", id: "vsix-module", desc: "Load .vsix extension packages", category: "Extensions", color: "#c586c0", installed: false },
  // Filesystem (4)
  { name: "File System", id: "fs-module", desc: "Virtual file system operations", category: "Filesystem", color: "#dcdcaa", installed: false },
  { name: "Symbol Indexer", id: "indexer-module", desc: "File & symbol index service", category: "Filesystem", color: "#9cdcfe", installed: false },
  { name: "Search Engine", id: "search-module", desc: "Full-text file search", category: "Filesystem", color: "#4ec9b0", installed: false },
  { name: "Workspace", id: "workspace-module", desc: "Multi-root workspace support", category: "Filesystem", color: "#569cd6", installed: false },
  // Language (9)
  { name: "TextMate Grammars", id: "context-module", desc: "TextMate grammar integration", category: "Language", color: "#ce9178", installed: false },
  { name: "Diagnostics", id: "diagnostics-module", desc: "Error & warning diagnostics", category: "Language", color: "#f14c4c", installed: false },
  { name: "ESLint", id: "eslint-module", desc: "ESLint integration", category: "Language", color: "#c586c0", installed: false },
  { name: "Language Config", id: "language-config", desc: "Language configuration rules", category: "Language", color: "#dcdcaa", installed: false },
  { name: "Language Detection", id: "language-detection", desc: "Auto language detection", category: "Language", color: "#9cdcfe", installed: false },
  { name: "LSP Bridge", id: "lsp-bridge-module", desc: "Language Server Protocol bridge", category: "Language", color: "#569cd6", installed: false },
  { name: "Monarch Grammars", id: "monarch-grammars", desc: "Monarch tokenizer grammars", category: "Language", color: "#4ec9b0", installed: false },
  { name: "Prettier", id: "prettier-module", desc: "Prettier code formatter", category: "Language", color: "#c586c0", installed: false },
  { name: "Symbol Index", id: "symbol-index-module", desc: "Workspace symbol indexing", category: "Language", color: "#4fc1ff", installed: false },
  // Platform (9)
  { name: "Concurrency", id: "concurrency-module", desc: "Async task concurrency control", category: "Platform", color: "#4ec9b0", installed: false },
  { name: "Crash Recovery", id: "crash-recovery-module", desc: "Auto-save & crash recovery", category: "Platform", color: "#f14c4c", installed: false },
  { name: "Fallback", id: "fallback-module", desc: "Graceful degradation fallbacks", category: "Platform", color: "#dcdcaa", installed: false },
  { name: "Feature Flags", id: "feature-flags-module", desc: "Runtime feature flag toggles", category: "Platform", color: "#b5cea8", installed: false },
  { name: "Performance", id: "performance-module", desc: "Performance monitoring", category: "Platform", color: "#ce9178", installed: false },
  { name: "Resources", id: "resource-module", desc: "Resource lifecycle management", category: "Platform", color: "#9cdcfe", installed: false },
  { name: "Security", id: "security-module", desc: "CSP & input sanitization", category: "Platform", color: "#f14c4c", installed: false },
  { name: "Streaming", id: "streaming-module", desc: "Server-sent event streams", category: "Platform", color: "#569cd6", installed: false },
  { name: "Web Workers", id: "worker-module", desc: "Background worker threads", category: "Platform", color: "#4fc1ff", installed: false },
  // SCM (5)
  { name: "Collaboration", id: "collab-module", desc: "Real-time collaborative editing", category: "SCM", color: "#89d185", installed: false },
  { name: "Git Integration", id: "git-module", desc: "Git operations & status", category: "SCM", color: "#ce9178", installed: false },
  { name: "Code Review", id: "review-module", desc: "Pull request review tools", category: "SCM", color: "#c586c0", installed: false },
  { name: "Snapshots", id: "snapshot-module", desc: "Local history snapshots", category: "SCM", color: "#dcdcaa", installed: false },
  { name: "Sync Service", id: "sync-module", desc: "Settings & state sync", category: "SCM", color: "#569cd6", installed: false },
];

// ── Theme catalog ───────────────────────────────────────────
interface ThemeInfo { name: string; type: "dark" | "light" | "contrast"; colors: { bg: string; fg: string; accent: string; sidebar: string }; }
const THEMES: ThemeInfo[] = [
  { name: "Dark+ (Default)", type: "dark", colors: { bg: "#1e1e1e", fg: "#d4d4d4", accent: "#007acc", sidebar: "#252526" } },
  { name: "Monokai", type: "dark", colors: { bg: "#272822", fg: "#f8f8f2", accent: "#a6e22e", sidebar: "#1e1f1c" } },
  { name: "Dracula", type: "dark", colors: { bg: "#282a36", fg: "#f8f8f2", accent: "#bd93f9", sidebar: "#21222c" } },
  { name: "One Dark Pro", type: "dark", colors: { bg: "#282c34", fg: "#abb2bf", accent: "#61afef", sidebar: "#21252b" } },
  { name: "Tokyo Night", type: "dark", colors: { bg: "#1a1b26", fg: "#a9b1d6", accent: "#7aa2f7", sidebar: "#16161e" } },
  { name: "GitHub Dark", type: "dark", colors: { bg: "#0d1117", fg: "#c9d1d9", accent: "#58a6ff", sidebar: "#161b22" } },
  { name: "Catppuccin Mocha", type: "dark", colors: { bg: "#1e1e2e", fg: "#cdd6f4", accent: "#cba6f7", sidebar: "#181825" } },
  { name: "Nord", type: "dark", colors: { bg: "#2e3440", fg: "#eceff4", accent: "#88c0d0", sidebar: "#2e3440" } },
  { name: "Light+ (Default)", type: "light", colors: { bg: "#ffffff", fg: "#000000", accent: "#007acc", sidebar: "#f3f3f3" } },
  { name: "Solarized Light", type: "light", colors: { bg: "#fdf6e3", fg: "#657b83", accent: "#268bd2", sidebar: "#eee8d5" } },
  { name: "GitHub Light", type: "light", colors: { bg: "#ffffff", fg: "#24292f", accent: "#0969da", sidebar: "#f6f8fa" } },
  { name: "High Contrast", type: "contrast", colors: { bg: "#000000", fg: "#ffffff", accent: "#1aebff", sidebar: "#000000" } },
];

export function wireSidebar(
  dom: DOMRefs,
  apis: WireframeAPIs,
  eventBus: EventBus,
  on: OnHandler,
  files: VirtualFile[],
) {
  let activeViewId = "explorer";
  let activeFileUri: string | null = null;
  const viewContainers: Record<string, HTMLElement> = {};

  function createViews() {
    viewContainers.explorer = buildExplorerView(files);
    viewContainers.search = buildSearchView();
    viewContainers.scm = buildScmView();
    viewContainers.debug = buildDebugView();
    viewContainers.extensions = buildExtensionsView();
    viewContainers.accounts = buildAccountsView();
    viewContainers["settings-gear"] = buildSettingsView();
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
      dom.sidebarToolbar.appendChild(makeToolbarBtn(title, svg));
    }
  }

  function makeToolbarBtn(title: string, svg: string): HTMLElement {
    const btn = el("div", {
      title,
      style: `width:22px;height:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:4px;color:${C.fgDim};transition:all .12s;`,
    });
    btn.innerHTML = svg;
    btn.addEventListener("mouseenter", () => { btn.style.background = "rgba(255,255,255,0.08)"; btn.style.color = C.fg; });
    btn.addEventListener("mouseleave", () => { btn.style.background = "transparent"; btn.style.color = C.fgDim; });
    return btn;
  }

  // ═══════════════════════════════════════════════════════════
  // ── Explorer View ──────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════

  function buildExplorerView(fileList: VirtualFile[]): HTMLElement {
    const container = el("div", { style: "overflow-y:auto;overflow-x:hidden;height:100%;" });
    const tree = buildTree(fileList);
    const projectNode: TreeNode = { name: "MONACO-VANCED", children: tree, expanded: true };
    container.appendChild(renderTree([projectNode], 0));
    return container;
  }

  function buildTree(fileList: VirtualFile[]): TreeNode[] {
    const root: TreeNode = { name: "", children: [] };
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

  function renderTree(nodes: TreeNode[], depth = 0): DocumentFragment {
    const frag = document.createDocumentFragment();
    const sorted = [...nodes].sort((a, b) => {
      if (a.children && !b.children) return -1;
      if (!a.children && b.children) return 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of sorted) frag.appendChild(node.children ? renderFolder(node, depth) : renderFile(node, depth));
    return frag;
  }

  function renderFolder(node: TreeNode, depth: number): HTMLElement {
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
    childContainer.appendChild(renderTree(node.children ?? [], depth + 1));
    row.addEventListener("click", () => {
      node.expanded = !node.expanded;
      chevron.style.transform = `rotate(${node.expanded ? "90deg" : "0"})`;
      childContainer.style.display = node.expanded ? "" : "none";
      folderIcon.innerHTML = node.expanded ? openSvg : closedSvg;
    });
    wrapper.append(row, childContainer);
    return wrapper;
  }

  function renderFile(node: TreeNode, depth: number): HTMLElement {
    const ext = getExt(node.name);
    const row = el("div", { class: "vsc-file-item", "data-uri": node.uri ?? "", style: `display:flex;align-items:center;height:22px;padding-left:${24 + depth * 16}px;cursor:pointer;user-select:none;` });
    const icon = el("span", { style: "margin-right:6px;display:inline-flex;align-items:center;" });
    icon.innerHTML = fileIconSvg(ext);
    const label = el("span", { style: `color:${C.fg};font-size:13px;` }, node.name);
    row.append(icon, label);
    row.addEventListener("click", () => { if (node.uri) eventBus.emit(FileEvents.Open, { uri: node.uri, label: node.name }); });
    return row;
  }

  function setActiveFile(uri: string) {
    activeFileUri = uri;
    const explorerEl = viewContainers.explorer;
    if (!explorerEl) return;
    explorerEl.querySelectorAll(".vsc-file-item").forEach((e) => {
      const item = e as HTMLElement;
      item.dataset.active = item.dataset.uri === uri ? "true" : "false";
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ── Search View ────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════

  function buildSearchView(): HTMLElement {
    const container = el("div", { style: "padding:10px 12px;overflow-y:auto;height:100%;" });
    const searchWrap = el("div", { style: "position:relative;margin-bottom:6px;" });
    const searchIcon = el("span", { style: `position:absolute;left:8px;top:50%;transform:translateY(-50%);color:${C.fgDim};display:flex;` });
    searchIcon.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001l3.85 3.85 1.06-1.06-3.85-3.85zm-5.242.156a5 5 0 110-10 5 5 0 010 10z"/></svg>`;
    const searchInput = el("input", { type: "text", placeholder: "Search", class: "vsc-input", style: "padding-left:28px;" }) as HTMLInputElement;
    searchWrap.append(searchIcon, searchInput);

    const replaceWrap = el("div", { style: "margin-bottom:8px;" });
    replaceWrap.appendChild(el("input", { type: "text", placeholder: "Replace", class: "vsc-input" }));

    const optionsRow = el("div", { style: `display:flex;gap:4px;margin-bottom:12px;` });
    for (const { label, abbr } of [{ label: "Match Case", abbr: "Aa" }, { label: "Whole Word", abbr: "Ab|" }, { label: "Use Regex", abbr: ".*" }]) {
      const toggle = el("div", { title: label, style: `padding:3px 7px;border:1px solid ${C.borderLight};border-radius:4px;cursor:pointer;font-size:11px;color:${C.fgDim};font-family:monospace;transition:all .12s;` }, abbr);
      let active = false;
      toggle.addEventListener("click", () => { active = !active; toggle.style.background = active ? C.buttonBg : "transparent"; toggle.style.color = active ? "#fff" : C.fgDim; toggle.style.borderColor = active ? C.accent : C.borderLight; });
      optionsRow.appendChild(toggle);
    }

    const results = el("div", { style: `color:${C.fgDim};font-size:12px;padding:4px 0;` }, "Type to search across files.");
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.trim().toLowerCase();
      results.innerHTML = "";
      if (!q) { results.textContent = "Type to search across files."; return; }
      let matchCount = 0;
      for (const f of files) {
        const lines = f.content.split("\n");
        const matches: { line: number; text: string }[] = [];
        for (let i = 0; i < lines.length; i++) { if (lines[i].toLowerCase().includes(q)) matches.push({ line: i + 1, text: lines[i].trim() }); }
        if (matches.length) {
          matchCount += matches.length;
          const fileRow = el("div", { style: "margin-top:8px;" });
          const fileLabel = el("div", { class: "vsc-file-item", style: `display:flex;align-items:center;height:24px;cursor:pointer;font-size:13px;color:${C.fg};padding:0 4px;gap:6px;` });
          const fIcon = el("span", { style: "display:inline-flex;align-items:center;flex-shrink:0;" });
          fIcon.innerHTML = fileIconSvg(getExt(f.name));
          fileLabel.append(fIcon, el("span", { style: "flex:1;" }, f.name), el("span", { class: "vsc-badge" }, String(matches.length)));
          fileLabel.addEventListener("click", () => eventBus.emit(FileEvents.Open, { uri: f.uri, label: f.name }));
          fileRow.appendChild(fileLabel);
          for (const m of matches.slice(0, 8)) {
            const mRow = el("div", { class: "vsc-file-item", style: `padding-left:28px;height:20px;display:flex;align-items:center;cursor:pointer;font-size:12px;color:${C.fgDim};overflow:hidden;white-space:nowrap;text-overflow:ellipsis;` });
            const lineNum = el("span", { style: "color:#858585;margin-right:8px;min-width:20px;text-align:right;font-size:11px;" }, String(m.line));
            const textSpan = el("span", { style: `color:${C.fg};` });
            const idx = m.text.toLowerCase().indexOf(q);
            if (idx >= 0) { textSpan.innerHTML = esc(m.text.slice(0, idx)) + `<span style="background:#613214;color:#e8912d;border-radius:2px;padding:0 1px;">${esc(m.text.slice(idx, idx + q.length))}</span>` + esc(m.text.slice(idx + q.length)); }
            else { textSpan.textContent = m.text; }
            mRow.append(lineNum, textSpan);
            mRow.addEventListener("click", () => eventBus.emit(FileEvents.Open, { uri: f.uri, label: f.name }));
            fileRow.appendChild(mRow);
          }
          results.appendChild(fileRow);
        }
      }
      if (matchCount === 0) results.textContent = "No results found.";
      else { const summary = el("div", { style: `font-size:12px;color:${C.fgDim};padding:4px 0;` }, `${matchCount} result${matchCount > 1 ? "s" : ""} in ${results.children.length} file${results.children.length > 1 ? "s" : ""}`); results.insertBefore(summary, results.firstChild); }
    });
    container.append(searchWrap, replaceWrap, optionsRow, results);
    return container;
  }

  function esc(s: string): string { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  // ═══════════════════════════════════════════════════════════
  // ── Source Control View ────────────────────────────────────
  // ═══════════════════════════════════════════════════════════

  function buildScmView(): HTMLElement {
    const container = el("div", { style: "padding:10px 12px;overflow-y:auto;height:100%;" });
    const commitInput = el("input", { type: "text", placeholder: "Message (Ctrl+Enter to commit)", class: "vsc-input", style: "margin-bottom:8px;" }) as HTMLInputElement;
    const commitBtn = el("button", { class: "vsc-btn vsc-btn-primary", style: "width:100%;margin-bottom:12px;" });
    commitBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z"/></svg>`;
    commitBtn.appendChild(el("span", {}, "Commit"));
    const sections = [
      { title: "Staged Changes", files: files.slice(0, 3), badge: "A" as const, badgeColor: C.successGreen },
      { title: "Changes", files: files.slice(3), badge: "M" as const, badgeColor: "#e2c08d" },
    ];
    const list = el("div");
    for (const sec of sections) {
      const header = el("div", { class: "vsc-section-header" });
      const chevron = el("span", { style: `display:inline-flex;transition:transform .12s;transform:rotate(90deg);margin-right:4px;` });
      chevron.innerHTML = `<svg width="10" height="10" viewBox="0 0 16 16"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
      const headerInner = el("span", { style: "display:flex;align-items:center;gap:2px;" });
      headerInner.append(chevron, el("span", {}, `${sec.title} (${sec.files.length})`));
      header.appendChild(headerInner);
      const body = el("div");
      let expanded = true;
      header.addEventListener("click", () => { expanded = !expanded; chevron.style.transform = `rotate(${expanded ? "90deg" : "0"})`; body.style.display = expanded ? "" : "none"; });
      for (const f of sec.files) {
        const row = el("div", { class: "vsc-file-item", style: `display:flex;align-items:center;height:24px;padding:0 8px;cursor:pointer;user-select:none;` });
        const iSpan = el("span", { style: "margin-right:6px;display:inline-flex;align-items:center;" });
        iSpan.innerHTML = fileIconSvg(getExt(f.name));
        row.append(iSpan, el("span", { style: `flex:1;color:${C.fg};font-size:13px;` }, f.name), el("span", { style: `font-size:11px;font-weight:600;padding:0 6px;color:${sec.badgeColor};` }, sec.badge));
        row.addEventListener("click", () => eventBus.emit(FileEvents.Open, { uri: f.uri, label: f.name }));
        body.appendChild(row);
      }
      list.append(header, body);
    }
    container.append(commitInput, commitBtn, list);
    return container;
  }

  // ═══════════════════════════════════════════════════════════
  // ── Debug View ─────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════

  function buildDebugView(): HTMLElement {
    const container = el("div", { style: "padding:10px 12px;overflow-y:auto;height:100%;" });
    const runBtn = el("button", { class: "vsc-btn vsc-btn-primary", style: "width:100%;margin-bottom:14px;" });
    runBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l10 6-10 6V2z"/></svg>`;
    runBtn.appendChild(el("span", {}, "Run and Debug"));
    const configSel = el("div", { class: "vsc-card", style: "margin-bottom:14px;" });
    for (const { name, desc } of [{ name: "Launch Program", desc: "Node.js" }, { name: "Attach to Process", desc: "Node.js" }, { name: "Launch Chrome", desc: "Chrome" }]) {
      const row = el("div", { class: "vsc-file-item", style: `display:flex;align-items:center;gap:8px;padding:6px 10px;cursor:pointer;font-size:13px;` });
      const icon = el("span", { style: `color:${C.successGreen};display:flex;` });
      icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l10 6-10 6V2z"/></svg>`;
      row.append(icon, el("span", { style: `color:${C.fg};flex:1;` }, name), el("span", { class: "vsc-tag" }, desc));
      configSel.appendChild(row);
    }
    const sections = el("div");
    for (const name of ["Variables", "Watch", "Call Stack", "Breakpoints"]) {
      const header = el("div", { class: "vsc-section-header" });
      const chevron = el("span", { style: `display:inline-flex;transition:transform .12s;margin-right:4px;` });
      chevron.innerHTML = `<svg width="10" height="10" viewBox="0 0 16 16"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
      const headerInner = el("span", { style: "display:flex;align-items:center;gap:2px;" });
      headerInner.append(chevron, el("span", {}, name));
      header.appendChild(headerInner);
      const body = el("div", { style: `display:none;padding:4px 8px;color:${C.fgDim};font-size:12px;` }, `No ${name.toLowerCase()} available.`);
      let expanded = false;
      header.addEventListener("click", () => { expanded = !expanded; chevron.style.transform = `rotate(${expanded ? "90deg" : "0"})`; body.style.display = expanded ? "" : "none"; });
      sections.append(header, body);
    }
    container.append(runBtn, configSel, sections);
    return container;
  }

  // ═══════════════════════════════════════════════════════════
  // ── Extensions View — Real 81 Plugin Modules ───────────────
  // ═══════════════════════════════════════════════════════════

  function buildExtensionsView(): HTMLElement {
    const container = el("div", { style: "overflow-y:auto;height:100%;display:flex;flex-direction:column;" });
    const searchWrap = el("div", { style: "padding:10px 12px 6px;" });
    const searchInput = el("input", { type: "text", placeholder: "Search extensions...", class: "vsc-input" }) as HTMLInputElement;
    searchWrap.appendChild(searchInput);

    const filterRow = el("div", { style: "display:flex;gap:4px;padding:4px 12px 10px;flex-wrap:wrap;" });
    let activeFilter = "all";
    const filters = [
      { id: "all", label: "All (81)" }, { id: "installed", label: "Installed" },
      { id: "Theming", label: "Theming" }, { id: "Editor", label: "Editor" },
      { id: "AI / Intelligence", label: "AI" }, { id: "Language", label: "Language" },
      { id: "Devtools", label: "Devtools" }, { id: "Extensions", label: "Extensions" },
      { id: "Platform", label: "Platform" }, { id: "SCM", label: "SCM" },
    ];
    const filterEls: HTMLElement[] = [];
    for (const f of filters) {
      const pill = el("div", { class: "vsc-tab-pill", "data-active": f.id === activeFilter ? "true" : "false" }, f.label);
      pill.addEventListener("click", () => { activeFilter = f.id; filterEls.forEach((fe) => fe.dataset.active = "false"); pill.dataset.active = "true"; renderExtList(); });
      filterEls.push(pill);
      filterRow.appendChild(pill);
    }

    const extList = el("div", { style: "flex:1;overflow-y:auto;padding:0 12px;" });
    function renderExtList() {
      extList.innerHTML = "";
      const q = searchInput.value.trim().toLowerCase();
      let filtered = PLUGIN_CATALOG;
      if (activeFilter === "installed") filtered = filtered.filter((p) => p.installed);
      else if (activeFilter !== "all") filtered = filtered.filter((p) => p.category === activeFilter);
      if (q) filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
      const groups = new Map<string, PluginInfo[]>();
      for (const p of filtered) { const cat = groups.get(p.category) ?? []; cat.push(p); groups.set(p.category, cat); }
      if (groups.size === 0) { extList.appendChild(el("div", { style: `color:${C.fgDim};font-size:12px;padding:16px 0;text-align:center;` }, "No extensions found.")); return; }
      for (const [cat, plugins] of groups) {
        const catHeader = el("div", { style: `font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:${C.fgDim};padding:8px 0 4px;display:flex;align-items:center;gap:6px;` });
        catHeader.append(el("span", {}, cat), el("span", { class: "vsc-badge", style: `font-size:9px;padding:0 5px;` }, String(plugins.length)));
        extList.appendChild(catHeader);
        for (const p of plugins) {
          const row = el("div", { class: "vsc-file-item", style: `display:flex;align-items:center;gap:10px;padding:8px 6px;cursor:pointer;` });
          const iconEl = el("div", { style: `width:36px;height:36px;min-width:36px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:${p.color}18;flex-shrink:0;` });
          iconEl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="${p.color}"><path d="M13.5 1.5L15 0h7.5L24 1.5V9l-1.5 1.5H15L13.5 9V1.5zM0 15l1.5-1.5H9L10.5 15v7.5L9 24H1.5L0 22.5V15zm0-12L1.5 1.5H9L10.5 3v7.5L9 12H1.5L0 10.5V3zm13.5 12L15 13.5h7.5L24 15v7.5L22.5 24H15l-1.5-1.5V15z"/></svg>`;
          const info = el("div", { style: "flex:1;min-width:0;" });
          const titleRow = el("div", { style: "display:flex;align-items:center;gap:6px;" });
          titleRow.append(el("span", { style: `font-size:13px;color:${C.fg};font-weight:500;` }, p.name));
          if (p.installed) { const check = el("span", { style: `color:${C.successGreen};display:flex;` }); check.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z"/></svg>`; titleRow.appendChild(check); }
          info.append(titleRow, el("div", { style: `font-size:11px;color:${C.fgDim};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;` }, p.desc));
          const action = el("button", { class: `vsc-btn ${p.installed ? "vsc-btn-secondary" : "vsc-btn-primary"}`, style: "font-size:11px;padding:3px 10px;flex-shrink:0;" }, p.installed ? "Installed" : "Install");
          row.append(iconEl, info, action);
          extList.appendChild(row);
        }
      }
    }
    searchInput.addEventListener("input", renderExtList);
    container.append(searchWrap, filterRow, extList);
    requestAnimationFrame(renderExtList);
    return container;
  }

  // ═══════════════════════════════════════════════════════════
  // ── Accounts View ──────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════

  function buildAccountsView(): HTMLElement {
    const container = el("div", { style: "padding:20px 16px;overflow-y:auto;height:100%;display:flex;flex-direction:column;align-items:center;" });
    const avatar = el("div", { style: `width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg, ${C.accent}, ${C.buttonHoverBg});display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:600;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,122,204,0.3);` }, "U");
    const name = el("div", { style: `font-size:15px;color:${C.fg};font-weight:500;margin-bottom:2px;` }, "User");
    const email = el("div", { style: `font-size:12px;color:${C.fgDim};margin-bottom:20px;` }, "user@example.com");
    const card = el("div", { class: "vsc-card", style: "width:100%;max-width:280px;" });
    for (const { label, icon } of [
      { label: "Sign in with GitHub", icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>` },
      { label: "Sign in with Microsoft", icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6.5" height="6.5" fill="#f25022"/><rect x="8.5" y="1" width="6.5" height="6.5" fill="#7fba00"/><rect x="1" y="8.5" width="6.5" height="6.5" fill="#00a4ef"/><rect x="8.5" y="8.5" width="6.5" height="6.5" fill="#ffb900"/></svg>` },
      { label: "Turn on Settings Sync", icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 1H7l.5.5v5l-.5.5H2.5l-.5-.5v-5l.5-.5zM3 6h4V2H3v4zm6.5-5H14l.5.5v5l-.5.5H9.5l-.5-.5v-5l.5-.5zm.5 5h4V2h-4v4zm-7 3H7l.5.5v5l-.5.5H2.5l-.5-.5v-5l.5-.5zM3 14h4v-4H3v4zm6.5-5H14l.5.5v5l-.5.5H9.5l-.5-.5v-5l.5-.5zm.5 5h4v-4h-4v4z"/></svg>` },
    ]) {
      const row = el("div", { class: "vsc-file-item", style: `display:flex;align-items:center;gap:10px;height:36px;padding:0 12px;cursor:pointer;font-size:13px;color:${C.fg};` });
      const iconEl = el("span", { style: `display:flex;align-items:center;flex-shrink:0;color:${C.fgDim};` });
      iconEl.innerHTML = icon;
      row.append(iconEl, el("span", {}, label));
      card.appendChild(row);
    }
    container.append(avatar, name, email, card);
    return container;
  }

  // ═══════════════════════════════════════════════════════════
  // ── Settings View — Tabbed ─────────────────────────────────
  // ═══════════════════════════════════════════════════════════

  function buildSettingsView(): HTMLElement {
    const container = el("div", { style: "overflow-y:auto;height:100%;display:flex;flex-direction:column;" });
    const tabStrip = el("div", { style: "display:flex;gap:2px;padding:8px 12px;flex-wrap:wrap;border-bottom:1px solid " + C.border + ";" });
    const TABS = ["Editor", "Themes", "Keybindings", "Extensions", "VSIX"];
    let activeTab = "Editor";
    const tabPanels: Record<string, HTMLElement> = {};
    const tabEls: HTMLElement[] = [];
    for (const tab of TABS) {
      const pill = el("div", { class: "vsc-tab-pill", "data-active": tab === activeTab ? "true" : "false" }, tab);
      pill.addEventListener("click", () => { activeTab = tab; tabEls.forEach((t) => t.dataset.active = "false"); pill.dataset.active = "true"; for (const [id, panel] of Object.entries(tabPanels)) panel.style.display = id === tab ? "" : "none"; });
      tabEls.push(pill);
      tabStrip.appendChild(pill);
    }
    const panelContainer = el("div", { style: "flex:1;overflow-y:auto;" });
    tabPanels.Editor = buildEditorSettingsTab();
    tabPanels.Themes = buildThemesTab();
    tabPanels.Keybindings = buildKeybindingsTab();
    tabPanels.Extensions = buildSettingsExtensionsTab();
    tabPanels.VSIX = buildVsixTab();
    for (const [id, panel] of Object.entries(tabPanels)) { panel.style.display = id === activeTab ? "" : "none"; panelContainer.appendChild(panel); }
    container.append(tabStrip, panelContainer);
    return container;
  }

  function buildEditorSettingsTab(): HTMLElement {
    const panel = el("div", { style: "padding:12px;" });
    const searchInput = el("input", { type: "text", placeholder: "Search settings...", class: "vsc-input", style: "margin-bottom:12px;" }) as HTMLInputElement;
    const settings = [
      { id: "editor.fontSize", label: "Font Size", type: "number" as const, value: "14", desc: "Controls the font size in pixels.", group: "Editor" },
      { id: "editor.fontFamily", label: "Font Family", type: "text" as const, value: "'JetBrains Mono', monospace", desc: "Controls the font family.", group: "Editor" },
      { id: "editor.tabSize", label: "Tab Size", type: "number" as const, value: "2", desc: "The number of spaces a tab is equal to.", group: "Editor" },
      { id: "editor.wordWrap", label: "Word Wrap", type: "select" as const, value: "off", options: ["off", "on", "wordWrapColumn", "bounded"], desc: "Controls how lines should wrap.", group: "Editor" },
      { id: "editor.minimap.enabled", label: "Minimap Enabled", type: "checkbox" as const, value: "true", desc: "Controls whether the minimap is shown.", group: "Editor" },
      { id: "editor.smoothScrolling", label: "Smooth Scrolling", type: "checkbox" as const, value: "true", desc: "Controls smooth scrolling in the editor.", group: "Editor" },
      { id: "editor.cursorBlinking", label: "Cursor Blinking", type: "select" as const, value: "smooth", options: ["blink", "smooth", "phase", "expand", "solid"], desc: "Controls the cursor animation style.", group: "Editor" },
      { id: "editor.bracketPairColorization", label: "Bracket Pair Colors", type: "checkbox" as const, value: "true", desc: "Enable bracket pair colorization.", group: "Editor" },
      { id: "editor.renderWhitespace", label: "Render Whitespace", type: "select" as const, value: "selection", options: ["none", "boundary", "selection", "trailing", "all"], desc: "Controls how whitespace is rendered.", group: "Editor" },
      { id: "files.autoSave", label: "Auto Save", type: "select" as const, value: "off", options: ["off", "afterDelay", "onFocusChange", "onWindowChange"], desc: "Controls auto save of editors.", group: "Files" },
      { id: "files.trimTrailingWhitespace", label: "Trim Trailing Whitespace", type: "checkbox" as const, value: "false", desc: "Trim trailing whitespace on save.", group: "Files" },
      { id: "workbench.startupEditor", label: "Startup Editor", type: "select" as const, value: "welcomePage", options: ["none", "welcomePage", "newUntitledFile"], desc: "Controls which editor is shown on startup.", group: "Workbench" },
    ];
    const list = el("div");
    function renderSettings(query = "") {
      list.innerHTML = "";
      const q = query.toLowerCase();
      let currentGroup = "";
      for (const s of settings) {
        if (q && !s.label.toLowerCase().includes(q) && !s.desc.toLowerCase().includes(q) && !s.id.toLowerCase().includes(q)) continue;
        if (s.group !== currentGroup) { currentGroup = s.group; list.appendChild(el("div", { style: `font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:${C.fgDim};padding:12px 0 6px;border-bottom:1px solid ${C.separator};margin-bottom:6px;` }, currentGroup)); }
        const row = el("div", { style: `padding:8px 0;` });
        row.append(el("div", { style: `font-size:13px;color:${C.fg};margin-bottom:2px;` }, s.label), el("div", { style: `font-size:12px;color:${C.fgDim};margin-bottom:6px;` }, s.desc));
        if (s.type === "checkbox") { const cb = el("input", { type: "checkbox", style: `accent-color:${C.accent};width:16px;height:16px;cursor:pointer;` }) as HTMLInputElement; cb.checked = s.value === "true"; row.appendChild(cb); }
        else if (s.type === "select") { const sel = el("select", { class: "vsc-input", style: "width:auto;min-width:160px;padding:4px 8px;" }) as HTMLSelectElement; for (const opt of s.options ?? []) { const o = el("option", { value: opt }, opt) as HTMLOptionElement; if (opt === s.value) o.selected = true; sel.appendChild(o); } row.appendChild(sel); }
        else { row.appendChild(el("input", { type: s.type, value: s.value, class: "vsc-input", style: "width:120px;" })); }
        list.appendChild(row);
      }
    }
    searchInput.addEventListener("input", () => renderSettings(searchInput.value));
    panel.append(searchInput, list);
    requestAnimationFrame(() => renderSettings());
    return panel;
  }

  function buildThemesTab(): HTMLElement {
    const panel = el("div", { style: "padding:12px;" });
    panel.appendChild(el("div", { style: `font-size:12px;color:${C.fgDim};margin-bottom:12px;` }, "Select a color theme for the editor:"));
    const grid = el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:8px;" });
    let activeTheme = "Dark+ (Default)";
    for (const theme of THEMES) {
      const card = el("div", { class: "vsc-card", style: `padding:0;cursor:pointer;overflow:hidden;border:2px solid ${theme.name === activeTheme ? C.accent : "transparent"};transition:border-color .15s;` });
      const preview = el("div", { style: `height:48px;background:${theme.colors.bg};display:flex;overflow:hidden;` });
      const miniSidebar = el("div", { style: `width:24px;background:${theme.colors.sidebar};border-right:1px solid rgba(255,255,255,0.06);` });
      const miniEditor = el("div", { style: "flex:1;padding:6px 8px;" });
      miniEditor.innerHTML = `<div style="width:60%;height:4px;background:${theme.colors.fg}30;border-radius:2px;margin-bottom:3px;"></div><div style="width:80%;height:4px;background:${theme.colors.fg}20;border-radius:2px;margin-bottom:3px;"></div><div style="width:40%;height:4px;background:${theme.colors.accent}60;border-radius:2px;"></div>`;
      const miniStatus = el("div", { style: `height:3px;background:${theme.colors.accent};` });
      preview.append(miniSidebar, miniEditor);
      preview.appendChild(miniStatus);
      const label = el("div", { style: `padding:6px 8px;font-size:12px;color:${C.fg};display:flex;align-items:center;justify-content:space-between;` });
      label.append(el("span", {}, theme.name), el("span", { class: "vsc-tag" }, theme.type));
      card.append(preview, label);
      card.addEventListener("click", () => { activeTheme = theme.name; grid.querySelectorAll(".vsc-card").forEach((c) => { (c as HTMLElement).style.borderColor = "transparent"; }); card.style.borderColor = C.accent; });
      grid.appendChild(card);
    }
    panel.appendChild(grid);
    return panel;
  }

  function buildKeybindingsTab(): HTMLElement {
    const panel = el("div", { style: "padding:12px;" });
    const searchInput = el("input", { type: "text", placeholder: "Search keybindings...", class: "vsc-input", style: "margin-bottom:12px;" }) as HTMLInputElement;
    const keybindings = [
      { command: "Open Command Palette", key: "Ctrl+Shift+P", when: "" },
      { command: "Quick Open File", key: "Ctrl+P", when: "" },
      { command: "Toggle Sidebar", key: "Ctrl+B", when: "" },
      { command: "Toggle Terminal", key: "Ctrl+`", when: "" },
      { command: "Find", key: "Ctrl+F", when: "editorFocus" },
      { command: "Replace", key: "Ctrl+H", when: "editorFocus" },
      { command: "Go to Line", key: "Ctrl+G", when: "" },
      { command: "Save File", key: "Ctrl+S", when: "" },
      { command: "Save All", key: "Ctrl+K S", when: "" },
      { command: "Close Tab", key: "Ctrl+W", when: "" },
      { command: "Split Editor", key: "Ctrl+\\", when: "" },
      { command: "Toggle Word Wrap", key: "Alt+Z", when: "editorFocus" },
      { command: "Format Document", key: "Shift+Alt+F", when: "editorFocus" },
      { command: "Go to Definition", key: "F12", when: "editorFocus" },
      { command: "Peek Definition", key: "Alt+F12", when: "editorFocus" },
      { command: "Rename Symbol", key: "F2", when: "editorFocus" },
      { command: "Toggle Comment", key: "Ctrl+/", when: "editorFocus" },
      { command: "Zoom In", key: "Ctrl+=", when: "" },
      { command: "Zoom Out", key: "Ctrl+-", when: "" },
    ];
    const header = el("div", { style: `display:flex;padding:4px 8px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:${C.fgDim};border-bottom:1px solid ${C.border};margin-bottom:4px;` });
    header.append(el("span", { style: "flex:1;" }, "Command"), el("span", { style: "width:120px;text-align:center;" }, "Keybinding"), el("span", { style: "width:80px;" }, "When"));
    const list = el("div");
    function renderKeybindings(q = "") {
      list.innerHTML = "";
      const filtered = q ? keybindings.filter((k) => k.command.toLowerCase().includes(q.toLowerCase()) || k.key.toLowerCase().includes(q.toLowerCase())) : keybindings;
      for (const kb of filtered) {
        const row = el("div", { class: "vsc-file-item", style: `display:flex;align-items:center;padding:4px 8px;height:28px;font-size:13px;cursor:pointer;` });
        const cmdSpan = el("span", { style: `flex:1;color:${C.fg};` }, kb.command);
        const keySpan = el("span", { style: "width:120px;text-align:center;display:flex;align-items:center;justify-content:center;gap:2px;" });
        const parts = kb.key.split("+");
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) keySpan.appendChild(el("span", { style: `color:${C.fgDim};font-size:10px;` }, "+"));
          keySpan.appendChild(el("span", { style: `display:inline-block;padding:1px 5px;background:${C.cardBg};border:1px solid ${C.borderLight};border-radius:3px;font-size:11px;color:${C.fg};font-family:monospace;` }, parts[i].trim()));
        }
        const whenSpan = el("span", { style: `width:80px;font-size:11px;color:${C.fgDim};` }, kb.when);
        row.append(cmdSpan, keySpan, whenSpan);
        list.appendChild(row);
      }
    }
    searchInput.addEventListener("input", () => renderKeybindings(searchInput.value));
    panel.append(searchInput, header, list);
    requestAnimationFrame(() => renderKeybindings());
    return panel;
  }

  function buildSettingsExtensionsTab(): HTMLElement {
    const panel = el("div", { style: "padding:12px;" });
    panel.appendChild(el("div", { style: `font-size:12px;color:${C.fgDim};margin-bottom:12px;` }, "Manage installed extensions:"));
    const installed = PLUGIN_CATALOG.filter((p) => p.installed);
    const notInstalled = PLUGIN_CATALOG.filter((p) => !p.installed);
    const installedList = el("div");
    installedList.appendChild(el("div", { style: `font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:${C.fgDim};padding:4px 0;margin-bottom:4px;` }, `Enabled (${installed.length})`));
    for (const p of installed) installedList.appendChild(makeCompactPluginRow(p, true));
    installedList.appendChild(el("div", { class: "vsc-separator" }));
    installedList.appendChild(el("div", { style: `font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:${C.fgDim};padding:4px 0;margin-bottom:4px;` }, `Available (${notInstalled.length})`));
    for (const p of notInstalled.slice(0, 15)) installedList.appendChild(makeCompactPluginRow(p, false));
    if (notInstalled.length > 15) installedList.appendChild(el("div", { style: `font-size:12px;color:${C.textLink};cursor:pointer;padding:8px 0;` }, `+ ${notInstalled.length - 15} more available...`));
    panel.appendChild(installedList);
    return panel;
  }

  function makeCompactPluginRow(p: PluginInfo, isInstalled: boolean): HTMLElement {
    const row = el("div", { class: "vsc-file-item", style: `display:flex;align-items:center;gap:8px;padding:5px 4px;cursor:pointer;` });
    row.append(
      el("div", { style: `width:8px;height:8px;border-radius:50%;background:${p.color};flex-shrink:0;` }),
      el("span", { style: `flex:1;font-size:13px;color:${C.fg};` }, p.name),
      el("span", { class: "vsc-tag" }, p.category),
      el("span", { style: `font-size:11px;color:${isInstalled ? C.successGreen : C.textLink};cursor:pointer;padding:2px 6px;` }, isInstalled ? "✓ Enabled" : "Install"),
    );
    return row;
  }

  function buildVsixTab(): HTMLElement {
    const panel = el("div", { style: "padding:12px;" });
    panel.append(
      el("div", { style: `font-size:13px;color:${C.fg};margin-bottom:8px;font-weight:500;` }, "Install from VSIX"),
      el("div", { style: `font-size:12px;color:${C.fgDim};margin-bottom:14px;line-height:1.5;` }, "Install extensions from .vsix packages. Drag and drop a .vsix file or click to browse."),
    );
    const dropZone = el("div", { style: `border:2px dashed ${C.borderLight};border-radius:8px;padding:32px 16px;text-align:center;cursor:pointer;transition:all .2s;` });
    dropZone.innerHTML = `<div style="margin-bottom:12px;color:${C.fgDim};"><svg width="40" height="40" viewBox="0 0 16 16" fill="${C.fgDim}"><path d="M11.5 1h-7l-.5.5v4H1.5l-.5.5v8l.5.5h13l.5-.5v-8l-.5-.5H12V1.5l-.5-.5zM5 2h6v3.5H5V2zM14 13H2V6h3v1.5l.5.5h5l.5-.5V6h3v7z"/></svg></div><div style="font-size:13px;color:${C.fg};margin-bottom:6px;">Drop .vsix file here</div><div style="font-size:12px;color:${C.fgDim};margin-bottom:12px;">or</div><button class="vsc-btn vsc-btn-primary" style="font-size:12px;">Browse Files...</button>`;
    dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.style.borderColor = C.accent; dropZone.style.background = `${C.accent}10`; });
    dropZone.addEventListener("dragleave", () => { dropZone.style.borderColor = C.borderLight; dropZone.style.background = "transparent"; });
    dropZone.addEventListener("drop", (e) => { e.preventDefault(); dropZone.style.borderColor = C.borderLight; dropZone.style.background = "transparent"; });
    const recentHeader = el("div", { style: `font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:${C.fgDim};padding:16px 0 6px;` }, "Recently Installed");
    const recentList = el("div", { class: "vsc-card" });
    for (const { name, version, size } of [{ name: "my-custom-theme-1.0.0.vsix", version: "1.0.0", size: "24 KB" }, { name: "local-snippets-2.1.3.vsix", version: "2.1.3", size: "8 KB" }]) {
      const row = el("div", { class: "vsc-file-item", style: `display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;` });
      const icon = el("span", { style: `color:${C.accent};display:flex;` });
      icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 1.5L15 0h7.5L24 1.5V9l-1.5 1.5H15L13.5 9V1.5zM0 15l1.5-1.5H9L10.5 15v7.5L9 24H1.5L0 22.5V15zm0-12L1.5 1.5H9L10.5 3v7.5L9 12H1.5L0 10.5V3zm13.5 12L15 13.5h7.5L24 15v7.5L22.5 24H15l-1.5-1.5V15z"/></svg>`;
      row.append(icon, el("span", { style: `flex:1;font-size:13px;color:${C.fg};` }, name), el("span", { class: "vsc-tag" }, version), el("span", { style: `font-size:11px;color:${C.fgDim};` }, size));
      recentList.appendChild(row);
    }
    panel.append(dropZone, recentHeader, recentList);
    return panel;
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
  on(FileEvents.Open, (p) => { const { uri } = p as { uri: string }; setActiveFile(uri); });
  on("tab:switch", (p) => { const { uri } = p as { uri: string }; setActiveFile(uri); });
}

export function wireResizeHandle(dom: DOMRefs) {
  const handle = el("div", { style: `position:absolute;right:-2px;top:0;bottom:0;width:4px;cursor:col-resize;z-index:5;` });
  dom.sidebarContainer.appendChild(handle);
  let dragging = false, startX = 0, startW = 0;
  handle.addEventListener("mousedown", (e) => { dragging = true; startX = e.clientX; startW = dom.sidebarContainer.offsetWidth; document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; });
  document.addEventListener("mousemove", (e) => { if (!dragging) return; dom.sidebarContainer.style.width = `${Math.max(170, Math.min(600, startW + (e.clientX - startX)))}px`; });
  document.addEventListener("mouseup", () => { if (!dragging) return; dragging = false; document.body.style.cursor = ""; document.body.style.userSelect = ""; });
}
