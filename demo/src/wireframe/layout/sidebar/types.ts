// ── Sidebar shared types & data catalogs ────────────────────

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { WireframeAPIs, VirtualFile } from "../../types";

export interface ViewContext {
  files: VirtualFile[];
  apis: WireframeAPIs;
  eventBus: InstanceType<typeof EventBus>;
}

// ── Plugin catalog — all 81 modules across 12 categories ────
export interface PluginInfo {
  name: string;
  id: string;
  desc: string;
  category: string;
  color: string;
  installed: boolean;
}

export const PLUGIN_CATALOG: PluginInfo[] = [
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
export interface ThemeInfo {
  name: string;
  type: "dark" | "light" | "contrast";
  colors: { bg: string; fg: string; accent: string; sidebar: string };
}

export const THEMES: ThemeInfo[] = [
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

// ── View title mapping ──────────────────────────────────────
export const VIEW_TITLES: Record<string, string> = {
  explorer: "Explorer",
  search: "Search",
  scm: "Source Control",
  debug: "Run and Debug",
  extensions: "Extensions",
  accounts: "Accounts",
  "settings-gear": "Settings",
};
