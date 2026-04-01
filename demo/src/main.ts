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

// ── Plugins: Devtools ────────────────────────────────────────
import { createTerminalPlugin } from "@enjoys/monaco-vanced/devtools/terminal-module";
import { createDebugPlugin } from "@enjoys/monaco-vanced/devtools/debugger-module";

// ── Events ───────────────────────────────────────────────────
import { FileEvents, PanelEvents, SidebarEvents } from "@enjoys/monaco-vanced/core/events";

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

// ── Mock File System ─────────────────────────────────────────
import { createMockFs, seedDemoProject, type MockFsAPI } from "./mock-fs";

// ── Wireframe ────────────────────────────────────────────────
import { mountWireframe, type WireframeAPIs, type VirtualFile } from "./wireframe";

// ── Build VirtualFile list from mock FS ──────────────────────

function buildVirtualFiles(fs: MockFsAPI): VirtualFile[] {
  const result: VirtualFile[] = [];
  const EXT_LANG: Record<string, string> = {
    ts: "typescript", tsx: "typescriptreact", js: "javascript", jsx: "javascriptreact",
    json: "json", css: "css", html: "html", md: "markdown", yaml: "yaml", yml: "yaml",
    py: "python", rs: "rust", go: "go", sh: "shell", sql: "sql", toml: "toml",
    mjs: "javascript", mts: "typescript",
  };
  for (const [path, content] of fs.getAllFiles()) {
    const name = path.split("/").pop() ?? path;
    const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
    result.push({ uri: path, name, language: EXT_LANG[ext] ?? "plaintext", content });
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
const { plugin: themePlugin } = createThemePlugin();
const { plugin: iconPlugin } = createIconPlugin();

// Layout
const { plugin: layoutPlugin, api: layoutApi } = createLayoutPlugin();
const { plugin: headerPlugin, api: headerApi } = createHeaderPlugin({ title: "Antigravity" });
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
const { plugin: extensionPlugin } = createExtensionPlugin();
const { plugin: marketplacePlugin } = createMarketplacePlugin();
const { plugin: vsixPlugin } = createVSIXPlugin();

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
  const { editorContainer } = mountWireframe(appRoot, apis, eventBus, DEMO_FILES, mockFs);

  const defaultFile = DEMO_FILES.find((f) => f.uri === "src/app.tsx")
    ?? DEMO_FILES.find((f) => f.uri === "src/main.tsx")
    ?? DEMO_FILES[0];

  // ── Create IDE ───────────────────────────────────────────
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

  // Pre-create all models so file switching is instant
  for (const file of DEMO_FILES) getOrCreateModel(file);

  // Set the default file model (replace the anonymous model from createMonacoIDE)
  const defaultModel = getOrCreateModel(defaultFile);
  ide.editor.setModel(defaultModel);

  // ── Wire file:open → switch Monaco model ─────────────────
  eventBus.on(FileEvents.Open, (payload: unknown) => {
    const { uri } = payload as { uri: string };
    console.log("[monaco-vanced] file:open →", uri);
    openFileInEditor(uri, DEMO_FILES);
  });

  // ── Wire editor content changes → mock FS ────────────────
  ide.editor.onDidChangeModelContent(() => {
    const model = ide.editor.getModel();
    if (!model) return;
    const uri = model.uri.path.replace(/^\//, "");
    mockFs.writeFile(uri, model.getValue());
    eventBus.emit("explorer:file-modified", { uri });
  });

  // ── Wire settings changes → Monaco editor options ────────
  eventBus.on("settings:change", (payload: unknown) => {
    const { id, value } = payload as { id: string; value: unknown };
    const optMap: Record<string, string> = {
      "editor.fontSize": "fontSize",
      "editor.fontFamily": "fontFamily",
      "editor.tabSize": "tabSize",
      "editor.wordWrap": "wordWrap",
      "editor.minimap.enabled": "minimap.enabled",
      "editor.smoothScrolling": "smoothScrolling",
      "editor.cursorBlinking": "cursorBlinking",
      "editor.bracketPairColorization": "bracketPairColorization.enabled",
      "editor.renderWhitespace": "renderWhitespace",
    };
    const opt = optMap[id];
    if (!opt) return;
    if (opt.includes(".")) {
      const [parent, child] = opt.split(".");
      ide.editor.updateOptions({ [parent]: { [child]: value } });
    } else {
      ide.editor.updateOptions({ [opt]: value });
    }
  });

  // ── Wire theme changes → Monaco ──────────────────────────
  eventBus.on("theme:change", (payload: unknown) => {
    const { monacoTheme } = payload as { name: string; type: string; monacoTheme: string };
    monaco.editor.setTheme(monacoTheme);
  });

  // ══════════════════════════════════════════════════════════
  // Status Bar — fully dynamic
  // ══════════════════════════════════════════════════════════

  statusbarApi.register({ id: "branch", label: "$(git-branch) main", alignment: "left", priority: 100 });
  statusbarApi.register({ id: "sync", label: "$(sync) 0↓ 0↑", alignment: "left", priority: 95, tooltip: "Synchronize Changes" });
  statusbarApi.register({ id: "errors", label: "$(error) 0  $(warning) 0", alignment: "left", priority: 90, tooltip: "No Problems" });
  statusbarApi.register({ id: "line-col", label: "Ln 1, Col 1", alignment: "right", priority: 100 });
  statusbarApi.register({ id: "selection", label: "", alignment: "right", priority: 95, visible: false });
  statusbarApi.register({ id: "spaces", label: "Spaces: 2", alignment: "right", priority: 80, tooltip: "Select Indentation" });
  statusbarApi.register({ id: "encoding", label: "UTF-8", alignment: "right", priority: 75 });
  statusbarApi.register({ id: "eol", label: "LF", alignment: "right", priority: 70 });
  statusbarApi.register({ id: "language", label: "TypeScript React", alignment: "right", priority: 65, command: "editor.action.changeLanguageMode" });
  statusbarApi.register({ id: "prettier", label: "$(check) Prettier", alignment: "right", priority: 50 });
  statusbarApi.register({ id: "feedback", label: "$(feedback)", alignment: "right", priority: 10, tooltip: "Submit Feedback" });
  statusbarApi.register({ id: "bell", label: "$(bell)", alignment: "right", priority: 5, tooltip: "No Notifications" });

  // ── Track cursor position ────────────────────────────────
  ide.editor.onDidChangeCursorPosition((e) => {
    statusbarApi.update("line-col", { label: `Ln ${e.position.lineNumber}, Col ${e.position.column}` });
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
    statusbarApi.update("language", { label: LANG_NAMES[model.getLanguageId()] ?? model.getLanguageId() });

    // EOL
    const eolSeq = model.getEOL();
    statusbarApi.update("eol", { label: eolSeq === "\r\n" ? "CRLF" : "LF" });

    // Encoding (always UTF-8 in browser Monaco)
    statusbarApi.update("encoding", { label: "UTF-8" });

    // Tab size / indentation
    const opts = model.getOptions();
    const indentLabel = opts.insertSpaces ? `Spaces: ${opts.tabSize}` : `Tab Size: ${opts.tabSize}`;
    statusbarApi.update("spaces", { label: indentLabel, tooltip: "Select Indentation" });

    // Title
    const filePath = model.uri.path.replace(/^\//, "");
    const fileName = filePath.split("/").pop() ?? filePath;
    document.title = `${fileName} — Antigravity — Monaco Vanced`;
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
    // ── navigation group ──────────────────────────────────
    {
      id: "antigravity.goToDefinition",
      label: "Go to Definition",
      contextMenuGroupId: "navigation",
      contextMenuOrder: 1,
      keybindings: [monaco.KeyCode.F12],
      precondition: "editorTextFocus",
      run: (ed) => { ed.getAction("editor.action.revealDefinition")?.run(); },
    },
    {
      id: "antigravity.goToReferences",
      label: "Go to References",
      contextMenuGroupId: "navigation",
      contextMenuOrder: 2,
      keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.F12],
      precondition: "editorTextFocus",
      run: (ed) => { ed.getAction("editor.action.goToReferences")?.run(); },
    },
    {
      id: "antigravity.peekDefinition",
      label: "Peek Definition",
      contextMenuGroupId: "navigation",
      contextMenuOrder: 3,
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.F12],
      precondition: "editorTextFocus",
      run: (ed) => { ed.getAction("editor.action.peekDefinition")?.run(); },
    },
    {
      id: "antigravity.goToLine",
      label: "Go to Line...",
      contextMenuGroupId: "navigation",
      contextMenuOrder: 4,
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG],
      run: (ed) => { ed.getAction("editor.action.gotoLine")?.run(); },
    },

    // ── 1_modification group ──────────────────────────────
    {
      id: "antigravity.formatDocument",
      label: "Format Document",
      contextMenuGroupId: "1_modification",
      contextMenuOrder: 1,
      keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
      precondition: "!editorReadonly",
      run: (ed) => { ed.getAction("editor.action.formatDocument")?.run(); },
    },
    {
      id: "antigravity.toggleComment",
      label: "Toggle Line Comment",
      contextMenuGroupId: "1_modification",
      contextMenuOrder: 2,
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash],
      precondition: "!editorReadonly",
      run: (ed) => { ed.getAction("editor.action.commentLine")?.run(); },
    },
    {
      id: "antigravity.toggleBlockComment",
      label: "Toggle Block Comment",
      contextMenuGroupId: "1_modification",
      contextMenuOrder: 3,
      keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyA],
      precondition: "!editorReadonly",
      run: (ed) => { ed.getAction("editor.action.blockComment")?.run(); },
    },
    {
      id: "antigravity.rename",
      label: "Rename Symbol",
      contextMenuGroupId: "1_modification",
      contextMenuOrder: 4,
      keybindings: [monaco.KeyCode.F2],
      precondition: "editorTextFocus && !editorReadonly",
      run: (ed) => { ed.getAction("editor.action.rename")?.run(); },
    },

    // ── 9_cutcopypaste group ──────────────────────────────
    {
      id: "antigravity.cut",
      label: "Cut",
      contextMenuGroupId: "9_cutcopypaste",
      contextMenuOrder: 1,
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX],
      run: (ed) => { ed.trigger("menu", "editor.action.clipboardCutAction", null); },
    },
    {
      id: "antigravity.copy",
      label: "Copy",
      contextMenuGroupId: "9_cutcopypaste",
      contextMenuOrder: 2,
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC],
      run: (ed) => { ed.trigger("menu", "editor.action.clipboardCopyAction", null); },
    },
    {
      id: "antigravity.paste",
      label: "Paste",
      contextMenuGroupId: "9_cutcopypaste",
      contextMenuOrder: 3,
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV],
      run: (ed) => { ed.focus(); document.execCommand("paste"); },
    },

    // ── z_commands group ──────────────────────────────────
    {
      id: "antigravity.commandPalette",
      label: "Command Palette...",
      contextMenuGroupId: "z_commands",
      contextMenuOrder: 1,
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP],
      run: () => { eventBus.emit("header:command-open", {}); },
    },
    {
      id: "antigravity.toggleSidebar",
      label: "Toggle Sidebar",
      contextMenuGroupId: "z_commands",
      contextMenuOrder: 2,
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB],
      run: () => { eventBus.emit(SidebarEvents.Toggle, {}); },
    },
    {
      id: "antigravity.togglePanel",
      label: "Toggle Panel",
      contextMenuGroupId: "z_commands",
      contextMenuOrder: 3,
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ],
      run: () => { eventBus.emit(PanelEvents.BottomToggle, {}); },
    },
    {
      id: "antigravity.openSettings",
      label: "Open Settings",
      contextMenuGroupId: "z_commands",
      contextMenuOrder: 4,
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Comma],
      run: () => { eventBus.emit("settings:ui-open", {}); },
    },

    // ── Palette-only (no contextMenuGroupId) ──────────────
    {
      id: "antigravity.find",
      label: "Find",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
      run: (ed) => { ed.getAction("actions.find")?.run(); },
    },
    {
      id: "antigravity.findReplace",
      label: "Find and Replace",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH],
      run: (ed) => { ed.getAction("editor.action.startFindReplaceAction")?.run(); },
    },
    {
      id: "antigravity.selectAll",
      label: "Select All",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA],
      run: (ed) => { ed.getAction("editor.action.selectAll")?.run(); },
    },
    {
      id: "antigravity.expandSelection",
      label: "Expand Selection",
      run: (ed) => { ed.getAction("editor.action.smartSelect.expand")?.run(); },
    },
    {
      id: "antigravity.undo",
      label: "Undo",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ],
      run: (ed) => { ed.trigger("menu", "undo", null); },
    },
    {
      id: "antigravity.redo",
      label: "Redo",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY],
      run: (ed) => { ed.trigger("menu", "redo", null); },
    },
    // Sidebar views
    {
      id: "antigravity.showExplorer",
      label: "Show Explorer",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyE],
      run: () => { eventBus.emit(SidebarEvents.ViewActivate, { viewId: "explorer" }); },
    },
    {
      id: "antigravity.showSearch",
      label: "Show Search",
      run: () => { eventBus.emit(SidebarEvents.ViewActivate, { viewId: "search" }); },
    },
    {
      id: "antigravity.showSourceControl",
      label: "Show Source Control",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyG],
      run: () => { eventBus.emit(SidebarEvents.ViewActivate, { viewId: "scm" }); },
    },
    {
      id: "antigravity.showDebug",
      label: "Show Run and Debug",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyD],
      run: () => { eventBus.emit(SidebarEvents.ViewActivate, { viewId: "debug" }); },
    },
    {
      id: "antigravity.showExtensions",
      label: "Show Extensions",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyX],
      run: () => { eventBus.emit(SidebarEvents.ViewActivate, { viewId: "extensions" }); },
    },
    // File
    {
      id: "antigravity.saveFile",
      label: "Save File",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => { notificationApi.show({ type: "success", message: "File saved.", duration: 2000 }); },
    },
    {
      id: "antigravity.newFile",
      label: "New File",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN],
      run: () => { notificationApi.show({ type: "info", message: "Use Explorer > New File toolbar button.", duration: 3000 }); },
    },
    // Help
    {
      id: "antigravity.welcome",
      label: "Welcome",
      run: () => { notificationApi.show({ type: "info", message: "Welcome to Antigravity — Monaco Vanced IDE", duration: 4000 }); },
    },
    {
      id: "antigravity.about",
      label: "About",
      run: () => { notificationApi.show({ type: "info", message: "Monaco Vanced v0.2.0 — Plugin-based IDE Architecture", duration: 4000 }); },
    },
    // Language
    {
      id: "antigravity.changeLanguageMode",
      label: "Change Language Mode",
      run: () => { notificationApi.show({ type: "info", message: "Language mode selection coming soon.", duration: 3000 }); },
    },
  ];

  // Register all actions with Monaco — appears in both palette + context menu
  for (const action of actions) {
    // ide.editor.addAction(action);
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
  // Open default file + welcome notification
  // ══════════════════════════════════════════════════════════

  eventBus.emit(FileEvents.Open, { uri: defaultFile.uri, label: defaultFile.name });

  notificationApi.show({
    type: "info",
    message: "Welcome to Antigravity — Right-click for context menu. Ctrl+Shift+P for command palette.",
    duration: 6000,
  });

  // Expose for dev console
  window.monaco = monaco;
  window.editor = ide.editor;
  window.engine = ide.engine;
  window.eventBus = ide.eventBus;
}

bootstrap().catch(console.error);
