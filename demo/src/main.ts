import "./style.css";
import * as monaco from "monaco-editor";

// ── Core ─────────────────────────────────────────────────────
import { createMonacoIDE } from "@enjoys/monaco-vanced/core/facade";
import { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { MonacoVancedInstance } from "@enjoys/monaco-vanced/core/facade";

// ── Plugins: Infrastructure ──────────────────────────────────
import { createSettingsPlugin } from "@enjoys/monaco-vanced/infrastructure/settings-module";
import { createNotificationPlugin } from "@enjoys/monaco-vanced/infrastructure/notification-module";
import { createCommandPlugin } from "@enjoys/monaco-vanced/infrastructure/command-module";
import { createKeybindingPlugin } from "@enjoys/monaco-vanced/infrastructure/keybinding-module";
import { createDialogPlugin } from "@enjoys/monaco-vanced/infrastructure/dialog-module";

// ── Plugins: Theming ─────────────────────────────────────────
import { createThemePlugin } from "@enjoys/monaco-vanced/theming/theme-module";
import { createIconPlugin } from "@enjoys/monaco-vanced/theming/icon-module";

// ── Plugins: Layout ──────────────────────────────────────────
import { createLayoutPlugin } from "@enjoys/monaco-vanced/layout/layout-module";
import { createHeaderPlugin } from "@enjoys/monaco-vanced/layout/header-module";
import { createSidebarPlugin } from "@enjoys/monaco-vanced/layout/sidebar-module";
import { createStatusbarPlugin } from "@enjoys/monaco-vanced/layout/statusbar-module";
import { createTitlePlugin } from "@enjoys/monaco-vanced/layout/title-module";
import { createNavigationPlugin } from "@enjoys/monaco-vanced/layout/navigation-module";
import { createUIPlugin } from "@enjoys/monaco-vanced/layout/ui-module";
import { createContextMenuPlugin } from "@enjoys/monaco-vanced/layout/context-menu-module";

// ── Plugins: Editor ──────────────────────────────────────────
import { createEditorPlugin } from "@enjoys/monaco-vanced/editor/editor-module";
import { createTabsPlugin } from "@enjoys/monaco-vanced/editor/tabs-module";

// ── Monaco Workers ────────────────────────────────────────────

import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === "typescript" || label === "javascript") return new tsWorker();
    if (label === "json") return new jsonWorker();
    if (label === "css" || label === "scss" || label === "less") return new cssWorker();
    if (label === "html" || label === "handlebars" || label === "razor") return new htmlWorker();
    return new editorWorker();
  },
};

// ── Wireframe ────────────────────────────────────────────────
import { mountWireframe, type WireframeAPIs, type VirtualFile } from "./wireframe";

// ── Virtual file system (demo) ──────────────────────────────

const DEMO_FILES: VirtualFile[] = [
  {
    uri: "src/main.ts", name: "main.ts", language: "typescript",
    content: [
      "import { createApp } from './app';",
      "import { setupRouter } from './router';",
      "import { initStore } from './store';",
      "",
      "async function bootstrap() {",
      "  const app = createApp();",
      "  const router = setupRouter();",
      "  const store = initStore();",
      "",
      "  app.use(router);",
      "  app.use(store);",
      "",
      "  await router.isReady();",
      "  app.mount('#app');",
      "",
      "  console.log('App mounted successfully! 🚀');",
      "}",
      "",
      "bootstrap();",
    ].join("\n"),
  },
  {
    uri: "src/app.ts", name: "app.ts", language: "typescript",
    content: [
      "export interface AppConfig {",
      "  name: string;",
      "  version: string;",
      "  debug: boolean;",
      "}",
      "",
      "export function createApp(config?: Partial<AppConfig>) {",
      "  const defaultConfig: AppConfig = {",
      "    name: 'Monaco Vanced',",
      "    version: '1.0.0',",
      "    debug: false,",
      "    ...config,",
      "  };",
      "",
      "  const plugins: unknown[] = [];",
      "",
      "  return {",
      "    config: defaultConfig,",
      "    use(plugin: unknown) { plugins.push(plugin); return this; },",
      "    mount(selector: string) {",
      "      const el = document.querySelector(selector);",
      "      if (!el) throw new Error(`Element ${selector} not found`);",
      "      console.log(`[${defaultConfig.name}] Mounted on ${selector}`);",
      "    },",
      "  };",
      "}",
    ].join("\n"),
  },
  {
    uri: "src/router.ts", name: "router.ts", language: "typescript",
    content: [
      "interface Route {",
      "  path: string;",
      "  component: string;",
      "  meta?: Record<string, unknown>;",
      "}",
      "",
      "const routes: Route[] = [",
      "  { path: '/', component: 'Home' },",
      "  { path: '/about', component: 'About', meta: { requiresAuth: false } },",
      "  { path: '/dashboard', component: 'Dashboard', meta: { requiresAuth: true } },",
      "  { path: '/settings', component: 'Settings', meta: { requiresAuth: true } },",
      "];",
      "",
      "export function setupRouter() {",
      "  let currentRoute: Route | null = null;",
      "",
      "  return {",
      "    routes,",
      "    navigate(path: string) {",
      "      currentRoute = routes.find(r => r.path === path) ?? null;",
      "      console.log('Navigating to:', path);",
      "    },",
      "    getCurrentRoute() { return currentRoute; },",
      "    async isReady() { return true; },",
      "  };",
      "}",
    ].join("\n"),
  },
  {
    uri: "src/store.ts", name: "store.ts", language: "typescript",
    content: [
      "interface State {",
      "  count: number;",
      "  user: { name: string; email: string } | null;",
      "  theme: 'light' | 'dark';",
      "}",
      "",
      "export function initStore() {",
      "  const state: State = {",
      "    count: 0,",
      "    user: null,",
      "    theme: 'dark',",
      "  };",
      "",
      "  const listeners = new Set<() => void>();",
      "",
      "  return {",
      "    getState: () => ({ ...state }),",
      "    dispatch(action: string, payload?: unknown) {",
      "      switch (action) {",
      "        case 'INCREMENT': state.count++; break;",
      "        case 'DECREMENT': state.count--; break;",
      "        case 'SET_USER': state.user = payload as State['user']; break;",
      "        case 'SET_THEME': state.theme = payload as State['theme']; break;",
      "      }",
      "      listeners.forEach(fn => fn());",
      "    },",
      "    subscribe(fn: () => void) {",
      "      listeners.add(fn);",
      "      return () => listeners.delete(fn);",
      "    },",
      "  };",
      "}",
    ].join("\n"),
  },
  {
    uri: "src/styles/global.css", name: "global.css", language: "css",
    content: [
      ":root {",
      "  --bg-primary: #1e1e1e;",
      "  --bg-secondary: #252526;",
      "  --text-primary: #cccccc;",
      "  --text-accent: #007acc;",
      "  --border-color: #3c3c3c;",
      "}",
      "",
      "* { box-sizing: border-box; margin: 0; padding: 0; }",
      "",
      "body {",
      "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;",
      "  background: var(--bg-primary);",
      "  color: var(--text-primary);",
      "  line-height: 1.5;",
      "}",
      "",
      ".container {",
      "  max-width: 1200px;",
      "  margin: 0 auto;",
      "  padding: 0 16px;",
      "}",
    ].join("\n"),
  },
  {
    uri: "src/components/Header.tsx", name: "Header.tsx", language: "typescriptreact",
    content: [
      "interface HeaderProps {",
      "  title: string;",
      "  showNav?: boolean;",
      "}",
      "",
      "export function Header({ title, showNav = true }: HeaderProps) {",
      "  return (",
      "    <header className=\"app-header\">",
      "      <h1>{title}</h1>",
      "      {showNav && (",
      "        <nav>",
      "          <a href=\"/\">Home</a>",
      "          <a href=\"/about\">About</a>",
      "          <a href=\"/dashboard\">Dashboard</a>",
      "        </nav>",
      "      )}",
      "    </header>",
      "  );",
      "}",
    ].join("\n"),
  },
  {
    uri: "package.json", name: "package.json", language: "json",
    content: JSON.stringify({
      name: "demo-project",
      version: "1.0.0",
      private: true,
      scripts: { dev: "vite", build: "tsc && vite build", preview: "vite preview" },
      dependencies: { "monaco-editor": "^0.55.1" },
      devDependencies: { typescript: "^6.0.0", vite: "^8.0.0" },
    }, null, 2),
  },
  {
    uri: "README.md", name: "README.md", language: "markdown",
    content: [
      "# Demo Project",
      "",
      "A sample project to demonstrate **Monaco Vanced** — the plugin-based IDE.",
      "",
      "## Features",
      "",
      "- 🔌 Plugin-based architecture",
      "- 🎨 VS Code dark theme",
      "- 📁 Multi-file editing with tabs",
      "- ⌨️ Command palette (Ctrl+Shift+P)",
      "- 🔍 Breadcrumb navigation",
      "",
      "## Getting Started",
      "",
      "```bash",
      "bun install",
      "bun run dev",
      "```",
    ].join("\n"),
  },
  {
    uri: "tsconfig.json", name: "tsconfig.json", language: "json",
    content: JSON.stringify({
      compilerOptions: {
        target: "ESNext", module: "ESNext", moduleResolution: "bundler",
        strict: true, jsx: "preserve", esModuleInterop: true,
        lib: ["ESNext", "DOM"],
      },
      include: ["src"],
    }, null, 2),
  },
  {
    uri: "settings.json", name: "settings.json", language: "json",
    content: JSON.stringify({
      "editor.fontSize": 14,
      "editor.fontFamily": "'JetBrains Mono', monospace",
      "editor.tabSize": 2,
      "editor.minimap.enabled": true,
      "editor.bracketPairColorization.enabled": true,
      "workbench.colorTheme": "Default Dark+",
      "terminal.integrated.fontSize": 13,
    }, null, 2),
  },
];

// ── Create plugins ──────────────────────────────────────────

// Infrastructure
const { plugin: commandPlugin, api: commandApi } = createCommandPlugin();
const { plugin: keybindingPlugin } = createKeybindingPlugin();
const { plugin: settingsPlugin } = createSettingsPlugin();
const { plugin: notificationPlugin, api: notificationApi } = createNotificationPlugin();
const { plugin: dialogPlugin, api: dialogApi } = createDialogPlugin();

// Theming
const { plugin: themePlugin } = createThemePlugin();
const { plugin: iconPlugin } = createIconPlugin();

// Layout
const { plugin: layoutPlugin, api: layoutApi } = createLayoutPlugin();
const { plugin: headerPlugin, api: headerApi } = createHeaderPlugin({ title: "Monaco Vanced" });
const { plugin: sidebarPlugin, api: sidebarApi } = createSidebarPlugin();
const { plugin: statusbarPlugin, api: statusbarApi } = createStatusbarPlugin();
const { plugin: titlePlugin, api: titleApi } = createTitlePlugin();
const { plugin: navigationPlugin } = createNavigationPlugin();
const { plugin: uiPlugin } = createUIPlugin();
const { plugin: contextMenuPlugin, api: contextMenuApi } = createContextMenuPlugin();

// Editor (bare MonacoPlugin, no api wrapper)
const editorPlugin = createEditorPlugin({ defaultLanguage: "typescript" });
const tabsPlugin = createTabsPlugin();

// ── All plugins ──────────────────────────────────────────────
const allPlugins = [
  commandPlugin, keybindingPlugin, settingsPlugin, notificationPlugin, dialogPlugin,
  themePlugin, iconPlugin,
  layoutPlugin, headerPlugin, sidebarPlugin, statusbarPlugin, titlePlugin,
  navigationPlugin, uiPlugin, contextMenuPlugin,
  editorPlugin, tabsPlugin,
];

// ── API bag for the wireframe ────────────────────────────────
const apis: WireframeAPIs = {
  header: headerApi, sidebar: sidebarApi, statusbar: statusbarApi,
  title: titleApi, layout: layoutApi, notification: notificationApi,
  command: commandApi, contextMenu: contextMenuApi, dialog: dialogApi,
};

// ── Default editor options ───────────────────────────────────

const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  language: "typescript",
  theme: "vs-dark",
  automaticLayout: true,
  minimap: { enabled: true },
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  fontLigatures: true,
  padding: { top: 12 },
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  cursorBlinking: "smooth",
  cursorSmoothCaretAnimation: "on",
  bracketPairColorization: { enabled: true },
  renderLineHighlight: "all",
  tabSize: 2,
  wordWrap: "off",
  lineNumbers: "on",
  folding: true,
  glyphMargin: true,
  fixedOverflowWidgets: true,
};

// ── Bootstrap ─────────────────────────────────────────────────

let ide: MonacoVancedInstance;

// Monaco model cache: uri → model
const models = new Map<string, monaco.editor.ITextModel>();

function getOrCreateModel(file: VirtualFile): monaco.editor.ITextModel {
  let model = models.get(file.uri);
  if (!model || model.isDisposed()) {
    const monacoUri = monaco.Uri.parse(`file:///${file.uri}`);
    model = monaco.editor.getModel(monacoUri) ?? monaco.editor.createModel(file.content, file.language, monacoUri);
    models.set(file.uri, model);
  }
  return model;
}

function openFileInEditor(uri: string) {
  const file = DEMO_FILES.find((f) => f.uri === uri);
  if (!file || !ide) return;
  const model = getOrCreateModel(file);
  ide.editor.setModel(model);
}

async function bootstrap() {
  const appRoot = document.getElementById("app");
  if (!appRoot) throw new Error("Missing #app element");

  // Create shared event bus
  const eventBus = new EventBus();

  // Mount the wireframe shell with the virtual file list
  const { editorContainer } = mountWireframe(appRoot, apis, eventBus, DEMO_FILES);

  // Get the default file content
  const defaultFile = DEMO_FILES[0];

  ide = await createMonacoIDE({
    container: editorContainer,
    monaco,
    plugins: allPlugins,
    language: defaultFile.language,
    value: defaultFile.content,
    editorOptions: editorOptions as Record<string, unknown>,
    eventBus,
  });

  console.log("[monaco-vanced] IDE ready:", ide.engine.getRegisteredIds());

  // Create models for all files upfront
  for (const file of DEMO_FILES) {
    getOrCreateModel(file);
  }

  // ── Wire file:open → switch Monaco model + open tab ────────
  eventBus.on("file:open", (payload: unknown) => {
    const { uri } = payload as { uri: string; label?: string };
    openFileInEditor(uri);
  });

  // ── Register default statusbar items ───────────────────────
  statusbarApi.register({ id: "branch", label: "$(git-branch) main", alignment: "left", priority: 100 });
  statusbarApi.register({ id: "sync", label: "$(sync) 0↓ 0↑", alignment: "left", priority: 95, tooltip: "Synchronize Changes" });
  statusbarApi.register({ id: "errors", label: "$(error) 0  $(warning) 0", alignment: "left", priority: 90, tooltip: "No Problems" });
  statusbarApi.register({ id: "line-col", label: "Ln 1, Col 1", alignment: "right", priority: 100 });
  statusbarApi.register({ id: "selection", label: "", alignment: "right", priority: 95 });
  statusbarApi.register({ id: "encoding", label: "UTF-8", alignment: "right", priority: 80 });
  statusbarApi.register({ id: "eol", label: "LF", alignment: "right", priority: 75 });
  statusbarApi.register({ id: "language", label: "TypeScript", alignment: "right", priority: 70 });
  statusbarApi.register({ id: "spaces", label: "Spaces: 2", alignment: "right", priority: 60, tooltip: "Select Indentation" });
  statusbarApi.register({ id: "prettier", label: "$(check) Prettier", alignment: "right", priority: 50 });
  statusbarApi.register({ id: "feedback", label: "$(feedback)", alignment: "right", priority: 10 });
  statusbarApi.register({ id: "bell", label: "$(bell)", alignment: "right", priority: 5, tooltip: "No Notifications" });

  // ── Track cursor position + selection for statusbar ────────
  ide.editor.onDidChangeCursorPosition((e) => {
    statusbarApi.update("line-col", { label: `Ln ${e.position.lineNumber}, Col ${e.position.column}` });
  });

  ide.editor.onDidChangeCursorSelection((e) => {
    const sel = e.selection;
    if (sel.isEmpty()) {
      statusbarApi.update("selection", { label: "", visible: false });
    } else {
      const lines = Math.abs(sel.endLineNumber - sel.startLineNumber);
      const text = ide.editor.getModel()?.getValueInRange(sel) ?? "";
      const chars = text.length;
      statusbarApi.update("selection", {
        label: lines > 0 ? `${lines + 1} lines, ${chars} chars selected` : `${chars} chars selected`,
        visible: true,
      });
    }
  });

  // Track language changes in statusbar when model switches
  ide.editor.onDidChangeModel((e) => {
    if (e.newModelUrl) {
      const model = monaco.editor.getModel(e.newModelUrl);
      if (model) {
        const lang = model.getLanguageId();
        const langMap: Record<string, string> = {
          typescript: "TypeScript", typescriptreact: "TypeScript React",
          javascript: "JavaScript", json: "JSON", css: "CSS",
          html: "HTML", markdown: "Markdown",
        };
        statusbarApi.update("language", { label: langMap[lang] ?? lang });
      }
    }
  });

  // Open the first file
  eventBus.emit("file:open", { uri: defaultFile.uri, label: defaultFile.name });

  // Show a welcome notification after boot
  notificationApi.show({
    type: "info",
    message: "Welcome to Monaco Vanced — click files in the Explorer to open them.",
    duration: 5000,
  });

  // Expose for dev console (typed via global.d.ts)
  window.monaco = monaco;
  window.editor = ide.editor;
  window.engine = ide.engine;
  window.eventBus = ide.eventBus;
}

bootstrap().catch(console.error);
