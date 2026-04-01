import "./style.css";
import * as monaco from "monaco-editor";

// ── Theme CSS custom properties (must init before wireframe) ─
import { initThemeVars, switchTheme, BUILTIN_THEME_NAMES, THEME_DEFS, registerThemes } from "./components/theme";

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

// ── Plugins: Extensions ──────────────────────────────────────
import { createExtensionPlugin } from "@enjoys/monaco-vanced/extensions/extension-module";
import { createMarketplacePlugin } from "@enjoys/monaco-vanced/extensions/marketplace-module";
import { createVSIXPlugin } from "@enjoys/monaco-vanced/extensions/vsix-module";

// ── Plugins: Filesystem ──────────────────────────────────────
import { createFSPlugin } from "@enjoys/monaco-vanced/filesystem/fs-module";
import type { FSAdapter, DirEntry, FileStat, WatchCallback } from "@enjoys/monaco-vanced/filesystem/fs-module";
import { createSearchPlugin } from "@enjoys/monaco-vanced/filesystem/search-module";

// ── Plugins: SCM ─────────────────────────────────────────────
import { createGitPlugin } from "@enjoys/monaco-vanced/scm/git-module";

// ── Plugins: Language ─────────────────────────────────────────
import { createLanguageDetectionPlugin, detectLanguage } from "@enjoys/monaco-vanced/language/language-detection";

// ── Plugins: Devtools ────────────────────────────────────────
import { createTerminalPlugin } from "@enjoys/monaco-vanced/devtools/terminal-module";
import { createDebugPlugin } from "@enjoys/monaco-vanced/devtools/debugger-module";

// ── Plugins: Auth ─────────────────────────────────────────────
import { createAuthPlugin } from "@enjoys/monaco-vanced/infrastructure/auth-module";

// ── Events ───────────────────────────────────────────────────
import { FileEvents, PanelEvents, SidebarEvents, SettingsEvents, ThemeEvents, TabEvents, EditorEvents, AuthEvents, WelcomeEvents, ExtensionEvents } from "@enjoys/monaco-vanced/core/events";

// ── Builtin theme definitions for registration ───────────────
import draculaTheme from "../../plugins/theming/theme-module/builtin/dracula.json";
import githubDarkTheme from "../../plugins/theming/theme-module/builtin/github-dark.json";
import githubLightTheme from "../../plugins/theming/theme-module/builtin/github-light.json";
import monokaiTheme from "../../plugins/theming/theme-module/builtin/monokai.json";
import oneDarkTheme from "../../plugins/theming/theme-module/builtin/one-dark.json";
import type { ThemeDefinition } from "../../plugins/theming/theme-module/types";

// ── Monaco Workers ────────────────────────────────────────────

import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === "typescript" || label === "javascript" || label === "typescriptreact" || label === "javascriptreact") return new tsWorker();
    if (label === "json") return new jsonWorker();
    if (label === "css" || label === "scss" || label === "less") return new cssWorker();
    if (label === "html" || label === "handlebars" || label === "razor") return new htmlWorker();
    return new editorWorker();
  },
};

// ── Configure TypeScript for JSX support ─────────────────────
monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ESNext,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
  strict: true,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  allowJs: true,
  noEmit: true,
});

monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ESNext,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
  allowJs: true,
  allowSyntheticDefaultImports: true,
  noEmit: true,
});

// ── Mock File System ─────────────────────────────────────────
import { createMockFs, seedDemoProject, type MockFsAPI } from "./mock-fs";

// ── Wireframe ────────────────────────────────────────────────
import { mountWireframe, type WireframeAPIs, type VirtualFile } from "./wireframe";

// ── Build VirtualFile list from mock FS ──────────────────────

function buildVirtualFiles(fs: MockFsAPI): VirtualFile[] {
  const result: VirtualFile[] = [];
  for (const [path, content] of fs.getAllFiles()) {
    const name = path.split("/").pop() ?? path;
    const detected = detectLanguage(path, content, monaco.languages);
    result.push({ uri: path, name, language: detected.languageId, content });
  }
  return result;
}

// ══════════════════════════════════════════════════════════════
// Create plugin instances
// ══════════════════════════════════════════════════════════════

// Infrastructure
const { plugin: commandPlugin, api: commandApi } = createCommandPlugin();
const { plugin: keybindingPlugin } = createKeybindingPlugin();
const { plugin: settingsPlugin } = createSettingsPlugin();
const { plugin: notificationPlugin, api: notificationApi } = createNotificationPlugin();
const { plugin: dialogPlugin, api: dialogApi } = createDialogPlugin();

// Theming
const { plugin: themePlugin, api: themeApi } = createThemePlugin();
const { plugin: iconPlugin, api: iconApi } = createIconPlugin();

// Layout
const { plugin: layoutPlugin, api: layoutApi } = createLayoutPlugin();
const { plugin: headerPlugin, api: headerApi } = createHeaderPlugin({ title: "Monaco Vanced" });
const { plugin: sidebarPlugin, api: sidebarApi } = createSidebarPlugin();
const { plugin: statusbarPlugin, api: statusbarApi } = createStatusbarPlugin();
const { plugin: titlePlugin, api: titleApi } = createTitlePlugin();
const { plugin: navigationPlugin } = createNavigationPlugin();
const { plugin: uiPlugin } = createUIPlugin();
const { plugin: contextMenuPlugin, api: contextMenuApi } = createContextMenuPlugin();

// Editor
const editorPlugin = createEditorPlugin({ defaultLanguage: "typescript" });
const tabsPlugin = createTabsPlugin();

// Extensions / FS / SCM / Devtools
const { plugin: extensionPlugin, api: extensionApi } = createExtensionPlugin();
const { plugin: marketplacePlugin, api: marketplaceApi } = createMarketplacePlugin();
const { plugin: vsixPlugin, api: vsixApi } = createVSIXPlugin();

// Language
const languageDetectionPlugin = createLanguageDetectionPlugin();

// Auth
const { plugin: authPlugin, api: authApi } = createAuthPlugin({
  providers: ["github", "google"],
  tokenStorageKey: "monaco-vanced-auth",
});

// In-memory FS adapter backed by the demo's mock filesystem
const memoryStore = new Map<string, Uint8Array>();
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const inMemoryAdapter: FSAdapter = {
  name: "memory",
  type: "local",
  capabilities: { indexing: true, watch: false, search: true, streaming: false, vectorIndex: false, symbolGraph: false },
  async read(path) {
    const data = memoryStore.get(path);
    if (!data) throw new Error(`ENOENT: ${path}`);
    return data;
  },
  async write(path, data) { memoryStore.set(path, data); },
  async delete(path) { memoryStore.delete(path); },
  async rename(from, to) {
    const data = memoryStore.get(from);
    if (data) { memoryStore.set(to, data); memoryStore.delete(from); }
  },
  async copy(from, to) {
    const data = memoryStore.get(from);
    if (data) memoryStore.set(to, new Uint8Array(data));
  },
  async move(from, to) { await this.rename(from, to); },
  async list(dir) {
    const entries: DirEntry[] = [];
    const prefix = dir.endsWith("/") ? dir : dir + "/";
    for (const [p] of memoryStore) {
      if (p.startsWith(prefix)) {
        const rest = p.slice(prefix.length);
        const name = rest.split("/")[0];
        if (!entries.some((e) => e.name === name)) {
          entries.push({ name, path: prefix + name, isDirectory: rest.includes("/"), size: 0, modified: Date.now() });
        }
      }
    }
    return entries;
  },
  async mkdir() { /* no-op for in-memory */ },
  async exists(path) { return memoryStore.has(path); },
  async stat(path) {
    const data = memoryStore.get(path);
    return { size: data?.byteLength ?? 0, modified: Date.now(), created: Date.now(), isDirectory: false };
  },
  watch() { return { dispose() {} }; },
};
const fsPlugin = createFSPlugin({ adapter: inMemoryAdapter });

const { plugin: searchPlugin } = createSearchPlugin();
const { plugin: gitPlugin } = createGitPlugin();
const { plugin: terminalPlugin } = createTerminalPlugin();
const { plugin: debugPlugin } = createDebugPlugin();

const allPlugins = [
  commandPlugin, keybindingPlugin, settingsPlugin, notificationPlugin, dialogPlugin,
  themePlugin, iconPlugin,
  layoutPlugin, headerPlugin, sidebarPlugin, statusbarPlugin, titlePlugin,
  navigationPlugin, uiPlugin, contextMenuPlugin,
  editorPlugin, tabsPlugin,
  extensionPlugin, marketplacePlugin, vsixPlugin,
  fsPlugin, searchPlugin, gitPlugin,
  terminalPlugin, debugPlugin,
  languageDetectionPlugin,
  authPlugin,
];

const apis: WireframeAPIs = {
  header: headerApi, sidebar: sidebarApi, statusbar: statusbarApi,
  title: titleApi, layout: layoutApi, notification: notificationApi,
  command: commandApi, contextMenu: contextMenuApi, dialog: dialogApi,
};

// ══════════════════════════════════════════════════════════════
// Editor options
// ══════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════
// Bootstrap
// ══════════════════════════════════════════════════════════════

let ide: MonacoVancedInstance;
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

function openFileInEditor(uri: string, files: VirtualFile[]) {
  const file = files.find((f) => f.uri === uri);
  if (!file || !ide) return;
  const model = getOrCreateModel(file);
  if (ide.editor.getModel() !== model) {
    ide.editor.setModel(model);
  }
}

async function bootstrap() {
  const appRoot = document.getElementById("app");
  if (!appRoot) throw new Error("Missing #app element");

  // ── Initialize theme CSS custom properties (before wireframe) ─
  initThemeVars();

  const eventBus = new EventBus();

  // ── Mock File System ─────────────────────────────────────
  const mockFs = createMockFs(eventBus);
  seedDemoProject(mockFs);
  const DEMO_FILES = buildVirtualFiles(mockFs);

  // Seed the in-memory FS adapter from mock files
  for (const [path, content] of mockFs.getAllFiles()) {
    memoryStore.set(path, encoder.encode(content));
  }

  // ── Mount Wireframe ──────────────────────────────────────
  const { editorContainer, settingsEl, welcomeEl, tabListEl, breadcrumbEl, titleCenterEl, activityBarEl, statusBarEl, sidebarEl } = mountWireframe(appRoot, apis, eventBus, DEMO_FILES, mockFs, {
    iconApi: iconApi,
    extensionApi: extensionApi,
    vsixApi: vsixApi,
    authApi: authApi,
    marketplaceApi: marketplaceApi,
  }, { useReactPanels: true, useReactTabs: true });

  const defaultFile = DEMO_FILES.find((f) => f.uri === "src/app.tsx")
    ?? DEMO_FILES.find((f) => f.uri === "src/main.tsx")
    ?? DEMO_FILES[0];

  // ── Register builtin themes into theme plugin before IDE creation ──
  const builtinThemes = [draculaTheme, githubDarkTheme, githubLightTheme, monokaiTheme, oneDarkTheme] as unknown as ThemeDefinition[];
  for (const t of builtinThemes) {
    themeApi.register(t);
  }

  // ── Create IDE ───────────────────────────────────────────
  ide = await createMonacoIDE({
    container: editorContainer,
    monaco,
    plugins: allPlugins,
    language: defaultFile.language,
    value: "",
    editorOptions: editorOptions as Record<string, unknown>,
    eventBus,
  });

  console.log("[monaco-vanced] IDE ready:", ide.engine.getRegisteredIds());

  // ── Register themes from plugin API (runtime, no static JSON imports) ──
  registerThemes(themeApi.getThemes());
  const currentThemeId = themeApi.getCurrent();
  if (currentThemeId) switchTheme(currentThemeId);

  // ── Mount React components (Settings + Welcome + Tabs + Breadcrumbs) ──
  const { mountReactComponents } = await import("./components/mount");
  mountReactComponents({
    settingsEl,
    welcomeEl,
    eventBus,
    recentFiles: DEMO_FILES.slice(0, 6).map((f) => ({ uri: f.uri, name: f.name })),
    tabListEl,
    breadcrumbEl,
    titleCenterEl,
    iconApi,
    fsApi: mockFs,
  });

  // Pre-create all models so file switching is instant
  for (const file of DEMO_FILES) getOrCreateModel(file);

  // ── Wire file:open → switch Monaco model ─────────────────
  eventBus.on(FileEvents.Open, (payload: unknown) => {
    const { uri } = payload as { uri: string };
    console.log("[monaco-vanced] file:open →", uri);
    openFileInEditor(uri, DEMO_FILES);
  });

  // ── Wire editor content changes → mock FS + dirty tracking ──
  const originalContents = new Map<string, string>();
  for (const file of DEMO_FILES) originalContents.set(file.uri, file.content);

  ide.editor.onDidChangeModelContent(() => {
    const model = ide.editor.getModel();
    if (!model) return;
    const uri = model.uri.path.replace(/^\//, "");
    const currentValue = model.getValue();
    mockFs.writeFile(uri, currentValue);
    eventBus.emit(FileEvents.Modified, { uri });

    // Track dirty state
    const original = originalContents.get(uri);
    const dirty = original !== undefined && original !== currentValue;
    eventBus.emit(TabEvents.Dirty, { uri, dirty });
  });

  // ── On file save → mark clean ──────────────────────────────
  eventBus.on(FileEvents.Save, (payload: unknown) => {
    const { uri } = payload as { uri: string };
    const model = models.get(uri);
    if (model) {
      originalContents.set(uri, model.getValue());
      eventBus.emit(TabEvents.Dirty, { uri, dirty: false });
    }
  });

  // ── Wire settings changes → Monaco editor options ────────
  eventBus.on(SettingsEvents.Change, (payload: unknown) => {
    const p = payload as { id?: string; key?: string; value: unknown; _src?: string };
    if (p._src === "main") return; // prevent re-entry
    const settingId = p.id ?? p.key ?? "";
    if (!settingId) return;

    // Re-emit with both id AND key so plugin engine onConfigChange works
    if (p.id && !p.key) {
      eventBus.emit(SettingsEvents.Change, { id: settingId, key: settingId, value: p.value, _src: "main" });
      return;
    }

    // ── Editor options mapping ─────────────────────────────
    const optMap: Record<string, string> = {
      "editor.fontSize": "fontSize",
      "editor.fontFamily": "fontFamily",
      "editor.fontWeight": "fontWeight",
      "editor.fontLigatures": "fontLigatures",
      "editor.lineHeight": "lineHeight",
      "editor.letterSpacing": "letterSpacing",
      "editor.tabSize": "tabSize",
      "editor.insertSpaces": "insertSpaces",
      "editor.wordWrap": "wordWrap",
      "editor.lineNumbers": "lineNumbers",
      "editor.folding": "folding",
      "editor.glyphMargin": "glyphMargin",
      "editor.minimap.enabled": "minimap.enabled",
      "editor.minimap.side": "minimap.side",
      "editor.smoothScrolling": "smoothScrolling",
      "editor.scrollBeyondLastLine": "scrollBeyondLastLine",
      "editor.cursorBlinking": "cursorBlinking",
      "editor.cursorStyle": "cursorStyle",
      "editor.cursorSmoothCaretAnimation": "cursorSmoothCaretAnimation",
      "editor.bracketPairColorization.enabled": "bracketPairColorization.enabled",
      "editor.renderWhitespace": "renderWhitespace",
      "editor.renderLineHighlight": "renderLineHighlight",
      "editor.suggestOnTriggerCharacters": "suggestOnTriggerCharacters",
      "editor.quickSuggestions": "quickSuggestions",
      "editor.snippetSuggestions": "snippetSuggestions",
      "editor.formatOnPaste": "formatOnPaste",
      "editor.formatOnType": "formatOnType",
      "diffEditor.renderSideBySide": "renderSideBySide",
    };
    const opt = optMap[settingId];
    if (opt) {
      if (opt.includes(".")) {
        const [parent, child] = opt.split(".");
        ide.editor.updateOptions({ [parent]: { [child]: p.value } });
      } else {
        ide.editor.updateOptions({ [opt]: p.value });
      }
      return;
    }

    // ── Workbench / UI toggle settings ─────────────────────
    switch (settingId) {
      case "workbench.colorTheme": {
        const themeName = String(p.value);
        // Use theme plugin API — handles CDN loading, caching, and Monaco registration
        themeApi.apply(themeName).catch((err) => {
          // Fallback: try case-insensitive match against registered names
          const match = BUILTIN_THEME_NAMES.find((n) => n.toLowerCase() === themeName.toLowerCase());
          if (match) {
            themeApi.apply(match).catch(() => console.warn("[theme] failed to apply:", themeName, err));
          }
        });
        break;
      }
      case "workbench.activityBar.visible":
        activityBarEl.style.display = p.value ? "" : "none";
        break;
      case "workbench.statusBar.visible":
        statusBarEl.style.display = p.value ? "" : "none";
        break;
      case "workbench.sideBar.location":
        sidebarEl.style.order = p.value === "right" ? "3" : "";
        activityBarEl.style.order = p.value === "right" ? "4" : "";
        break;
      case "breadcrumbs.enabled":
        breadcrumbEl.style.display = p.value ? "" : "none";
        break;
      case "workbench.editor.showIcons":
        document.documentElement.style.setProperty("--tab-icon-display", p.value ? "inline-flex" : "none");
        break;
      case "workbench.editor.highlightModifiedTabs":
        document.documentElement.style.setProperty("--tab-dirty-border", p.value ? "2px" : "0");
        break;
    }
  });

  // ── Wire theme changes → Monaco + wireframe CSS vars ──────
  eventBus.on(ThemeEvents.Changed, (payload: unknown) => {
    const p = payload as { name?: string; themeId?: string; monacoTheme?: string };
    const themeKey = p.name ?? p.themeId ?? "";
    const def = THEME_DEFS[themeKey];
    const monacoTheme = p.monacoTheme ?? (def?.type === "light" ? "vs" : def?.type === "hc" ? "hc-black" : "vs-dark");
    monaco.editor.setTheme(monacoTheme);
    switchTheme(themeKey);
    // Re-register any newly loaded themes from the plugin
    registerThemes(themeApi.getThemes());
  });

  // ── Wire language detection → Monaco model language ───────
  eventBus.on(EditorEvents.LanguageChange, (payload: unknown) => {
    const { uri, language } = payload as { uri: string; language: string };
    const model = models.get(uri);
    if (model) {
      monaco.editor.setModelLanguage(model, language);
    }
  });

  // ══════════════════════════════════════════════════════════
  // Status Bar — fully dynamic
  // ══════════════════════════════════════════════════════════

  statusbarApi.register({ id: "branch", label: "$(git-branch) main", alignment: "left", priority: 100, tooltip: "main (Git Branch) — Click to Checkout" });
  statusbarApi.register({ id: "sync", label: "$(sync) 0↓ 0↑", alignment: "left", priority: 95, tooltip: "Synchronize Changes — 0 pending pull, 0 pending push" });
  statusbarApi.register({ id: "errors", label: "$(error) 0  $(warning) 0", alignment: "left", priority: 90, tooltip: "No Problems — Click to Toggle Problems Panel" });
  statusbarApi.register({ id: "line-col", label: "Ln 1, Col 1", alignment: "right", priority: 100, tooltip: "Go to Line/Column" });
  statusbarApi.register({ id: "selection", label: "", alignment: "right", priority: 95, visible: false, tooltip: "Characters Selected" });
  statusbarApi.register({ id: "spaces", label: "Spaces: 2", alignment: "right", priority: 80, tooltip: "Select Indentation — Spaces: 2" });
  statusbarApi.register({ id: "encoding", label: "UTF-8", alignment: "right", priority: 75, tooltip: "Select Encoding" });
  statusbarApi.register({ id: "eol", label: "LF", alignment: "right", priority: 70, tooltip: "Select End of Line Sequence" });
  statusbarApi.register({ id: "language", label: "TypeScript React", alignment: "right", priority: 65, tooltip: "Select Language Mode — TypeScript React" });
  statusbarApi.register({ id: "prettier", label: "$(check) Prettier", alignment: "right", priority: 50, tooltip: "Prettier — Formatter (Default)" });
  statusbarApi.register({ id: "feedback", label: "$(feedback)", alignment: "right", priority: 10, tooltip: "Tweet Feedback" });
  statusbarApi.register({ id: "bell", label: "$(bell)", alignment: "right", priority: 5, tooltip: "No Notifications — Click to Show" });

  // ── Track cursor position ────────────────────────────────
  ide.editor.onDidChangeCursorPosition((e) => {
    statusbarApi.update("line-col", {
      label: `Ln ${e.position.lineNumber}, Col ${e.position.column}`,
      tooltip: `Go to Line/Column — Line ${e.position.lineNumber}, Column ${e.position.column}`,
    });
  });

  // ── Track selection ──────────────────────────────────────
  ide.editor.onDidChangeCursorSelection((e) => {
    const sel = e.selection;
    if (sel.isEmpty()) {
      statusbarApi.update("selection", { label: "", visible: false });
    } else {
      const lines = Math.abs(sel.endLineNumber - sel.startLineNumber);
      const text = ide.editor.getModel()?.getValueInRange(sel) ?? "";
      statusbarApi.update("selection", {
        label: lines > 0 ? `${lines + 1} lines, ${text.length} chars selected` : `${text.length} selected`,
        visible: true,
        tooltip: lines > 0 ? `${lines + 1} Lines, ${text.length} Characters Selected` : `${text.length} Characters Selected`,
      });
    }
  });

  // ── Track model/language changes ─────────────────────────
  const LANG_NAMES: Record<string, string> = {
    typescript: "TypeScript", typescriptreact: "TypeScript React",
    javascript: "JavaScript", javascriptreact: "JavaScript React",
    json: "JSON", css: "CSS", scss: "SCSS", html: "HTML",
    markdown: "Markdown", python: "Python", rust: "Rust", go: "Go",
    yaml: "YAML", shell: "Shell Script", sql: "SQL", plaintext: "Plain Text",
    xml: "XML", graphql: "GraphQL",
  };

  function updateModelMeta() {
    const model = ide.editor.getModel();
    if (!model) return;

    // Language
    const langName = LANG_NAMES[model.getLanguageId()] ?? model.getLanguageId();
    statusbarApi.update("language", { label: langName, tooltip: `Select Language Mode — ${langName}` });

    // EOL
    const eolSeq = model.getEOL();
    const eolLabel = eolSeq === "\r\n" ? "CRLF" : "LF";
    statusbarApi.update("eol", { label: eolLabel, tooltip: `Select End of Line Sequence — ${eolLabel}` });

    // Encoding (always UTF-8 in browser Monaco)
    statusbarApi.update("encoding", { label: "UTF-8" });

    // Tab size / indentation
    const opts = model.getOptions();
    const indentLabel = opts.insertSpaces ? `Spaces: ${opts.tabSize}` : `Tab Size: ${opts.tabSize}`;
    statusbarApi.update("spaces", { label: indentLabel, tooltip: `Select Indentation — ${indentLabel}` });

    // Title
    const filePath = model.uri.path.replace(/^\//, "");
    const fileName = filePath.split("/").pop() ?? filePath;
    document.title = `${fileName} — Monaco Vanced`;
  }

  ide.editor.onDidChangeModel(() => { updateModelMeta(); });
  // Also update on language change within the same model
  monaco.editor.onDidChangeModelLanguage(() => { updateModelMeta(); });

  // ── Track diagnostics (error/warning markers) ─────────────
  function updateDiagnostics() {
    const markers = monaco.editor.getModelMarkers({});
    let errors = 0;
    let warnings = 0;
    for (const m of markers) {
      if (m.severity === monaco.MarkerSeverity.Error) errors++;
      else if (m.severity === monaco.MarkerSeverity.Warning) warnings++;
    }
    statusbarApi.update("errors", {
      label: `$(error) ${errors}  $(warning) ${warnings}`,
      tooltip: errors + warnings > 0 ? `${errors} error(s), ${warnings} warning(s)` : "No Problems",
    });
  }
  // Monaco fires onDidChangeMarkers when diagnostics change
  monaco.editor.onDidChangeMarkers(() => { updateDiagnostics(); });
  // Initial update
  updateDiagnostics();
  updateModelMeta();

  // ══════════════════════════════════════════════════════════
  // Commands — "Define once → use everywhere"
  // editor.addAction() powers both Monaco's built-in Command Palette
  // (Ctrl+Shift+P / F1) AND the right-click Context Menu.
  // See: context/monaco-command-system.txt
  //
  // contextMenuGroupId controls WHERE in the right-click menu:
  //   navigation       → top (Go to..., Peek...)
  //   1_modification   → editing (Format, Comment, Rename)
  //   9_cutcopypaste   → clipboard area
  //   z_commands       → bottom (palette, sidebar, panel)
  //   (omit)           → palette-only, no context menu entry
  // ══════════════════════════════════════════════════════════

  
const actions: monaco.editor.IActionDescriptor[] = [
   
    {
      id: "monacoVanced.toggleSidebar",
      label: "Toggle Sidebar",
      contextMenuGroupId: "z_commands",
      contextMenuOrder: 2,
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB],
      run: () => { eventBus.emit(SidebarEvents.Toggle, {}); },
    },
    {
      id: "monacoVanced.togglePanel",
      label: "Toggle Panel",
      contextMenuGroupId: "z_commands",
      contextMenuOrder: 3,
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ],
      run: () => { eventBus.emit(PanelEvents.BottomToggle, {}); },
    },
    {
      id: "monacoVanced.openSettings",
      label: "Open Settings",
      contextMenuGroupId: "z_commands",
      contextMenuOrder: 4,
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Comma],
      run: () => { eventBus.emit(SettingsEvents.UIOpen, {}); },
    },

    // ── Palette-only (no contextMenuGroupId) ──────────────
    {
      id: "monacoVanced.find",
      label: "Find",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
      run: (ed) => { ed.getAction("actions.find")?.run(); },
    },
    {
      id: "monacoVanced.findReplace",
      label: "Find and Replace",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH],
      run: (ed) => { ed.getAction("editor.action.startFindReplaceAction")?.run(); },
    },
    {
      id: "monacoVanced.selectAll",
      label: "Select All",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA],
      run: (ed) => { ed.getAction("editor.action.selectAll")?.run(); },
    },
    {
      id: "monacoVanced.expandSelection",
      label: "Expand Selection",
      run: (ed) => { ed.getAction("editor.action.smartSelect.expand")?.run(); },
    },
 
    {
      id: "monacoVanced.showSourceControl",
      label: "Show Source Control",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyG],
      run: () => { eventBus.emit(SidebarEvents.ViewActivate, { viewId: "scm" }); },
    },
    {
      id: "monacoVanced.showDebug",
      label: "Show Run and Debug",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyD],
      run: () => { eventBus.emit(SidebarEvents.ViewActivate, { viewId: "debug" }); },
    },
    {
      id: "monacoVanced.showExtensions",
      label: "Show Extensions",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyX],
      run: () => { eventBus.emit(SidebarEvents.ViewActivate, { viewId: "extensions" }); },
    },
    // File
    {
      id: "monacoVanced.saveFile",
      label: "Save File",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => { notificationApi.show({ type: "success", message: "File saved.", duration: 2000 }); },
    },
    {
      id: "monacoVanced.newFile",
      label: "New File",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN],
      run: () => { notificationApi.show({ type: "info", message: "Use Explorer > New File toolbar button.", duration: 3000 }); },
    },
    // Help
    {
      id: "monacoVanced.welcome",
      label: "Welcome",
      run: () => { notificationApi.show({ type: "info", message: "Welcome to Monaco Vanced IDE", duration: 4000 }); },
    },
    {
      id: "monacoVanced.about",
      label: "About",
      run: () => { notificationApi.show({ type: "info", message: "Monaco Vanced v0.2.0 — Plugin-based IDE Architecture", duration: 4000 }); },
    },
    // Language
    {
      id: "monacoVanced.changeLanguageMode",
      label: "Change Language Mode",
      run: () => { notificationApi.show({ type: "info", message: "Language mode selection coming soon.", duration: 3000 }); },
    },
  ];

  // Register all actions with Monaco — appears in both palette + context menu
  for (const action of actions) {
    ide.editor.addAction(action);
  }

  // Also register with command module for wireframe palette
  for (const action of actions) {
    commandApi.register({
      id: action.id,
      label: action.label,
      handler: () => action.run(ide.editor, undefined as never),
    });
  }
  // ══════════════════════════════════════════════════════════
  // Startup behavior based on workbench.startupEditor setting
  // ══════════════════════════════════════════════════════════

  const startupEditor: string = "welcomePage"; // default, overridden by settings
  switch (startupEditor) {
    case "none":
      // Show blank editor — do nothing
      break;
    case "newUntitledFile":
      // Create an empty untitled model
      ide.editor.setModel(monaco.editor.createModel("", "plaintext"));
      break;
    case "readme": {
      const readmeFile = DEMO_FILES.find((f) => f.uri.toLowerCase() === "readme.md");
      if (readmeFile) {
        eventBus.emit(FileEvents.Open, { uri: readmeFile.uri, label: readmeFile.name });
      }
      break;
    }
    case "welcomePage":
    default:
      // Welcome page is shown by default via wireframe
      eventBus.emit(WelcomeEvents.Show, {});
      break;
  }

  // ── Wire startupEditor setting changes ───────────────────
  eventBus.on(SettingsEvents.Change, (payload: unknown) => {
    const p = payload as { id?: string; key?: string; value: unknown; _src?: string };
    const settingId = p.id ?? p.key ?? "";
    if (settingId === "workbench.startupEditor") {
      // Store for next session (in localStorage)
      try { localStorage.setItem("monaco-vanced:startupEditor", String(p.value)); } catch { /* ignore */ }
    }
  });

  // ── Wire plugin enable/disable ───────────────────────────
  eventBus.on(ExtensionEvents.Enabled, (payload: unknown) => {
    const { id } = payload as { id: string };
    console.log("[monaco-vanced] Plugin enabled:", id);
  });
  eventBus.on(ExtensionEvents.Disabled, (payload: unknown) => {
    const { id } = payload as { id: string };
    console.log("[monaco-vanced] Plugin disabled:", id);
  });

  notificationApi.show({
    type: "info",
    message: "Welcome to Monaco Vanced — Right-click for context menu. Ctrl+Shift+P for command palette.",
    duration: 6000,
  });

  // Expose for dev console
  window.monaco = monaco;
  window.editor = ide.editor;
  window.engine = ide.engine;
  window.eventBus = ide.eventBus;
}

bootstrap().catch(console.error);
