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
import { mountWireframe, type WireframeAPIs } from "./wireframe";

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

// ── All plugins (boot order handled by engine via priority + deps) ──
const allPlugins = [
  commandPlugin,
  keybindingPlugin,
  settingsPlugin,
  notificationPlugin,
  dialogPlugin,
  themePlugin,
  iconPlugin,
  layoutPlugin,
  headerPlugin,
  sidebarPlugin,
  statusbarPlugin,
  titlePlugin,
  navigationPlugin,
  uiPlugin,
  contextMenuPlugin,
  editorPlugin,
  tabsPlugin,
];

// ── API bag for the wireframe ────────────────────────────────
const apis: WireframeAPIs = {
  header: headerApi,
  sidebar: sidebarApi,
  statusbar: statusbarApi,
  title: titleApi,
  layout: layoutApi,
  notification: notificationApi,
  command: commandApi,
  contextMenu: contextMenuApi,
  dialog: dialogApi,
};

// ── Default editor options ───────────────────────────────────

const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  value: [
    "// Welcome to Monaco Vanced ⚡",
    "// A plugin-based IDE built on Monaco Editor",
    "",
    "interface User {",
    "  name: string;",
    "  email: string;",
    "  role: 'admin' | 'editor' | 'viewer';",
    "}",
    "",
    "function greet(user: User): string {",
    "  return `Hello, ${user.name}! You are a ${user.role}.`;",
    "}",
    "",
    "const user: User = {",
    '  name: "Monaco Vanced",',
    '  email: "hello@monaco-vanced.dev",',
    '  role: "admin",',
    "};",
    "",
    "console.log(greet(user));",
  ].join("\n"),
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

async function bootstrap() {
  const appRoot = document.getElementById("app");
  if (!appRoot) throw new Error("Missing #app element");

  // Create shared event bus — used by both wireframe and engine
  const eventBus = new EventBus();

  // Mount the wireframe shell — returns the editor container element
  const { editorContainer } = mountWireframe(appRoot, apis, eventBus);

  ide = await createMonacoIDE({
    container: editorContainer,
    monaco,
    plugins: allPlugins,
    language: "typescript",
    value: editorOptions.value as string,
    editorOptions,
    eventBus, // share the same bus
  });

  console.log("[monaco-vanced] IDE ready:", ide.engine.getRegisteredIds());

  // Register default statusbar items
  statusbarApi.register({ id: "branch", label: "⎇ main", alignment: "left", priority: 100 });
  statusbarApi.register({ id: "errors", label: "$(error) 0  $(warning) 0", alignment: "left", priority: 90 });
  statusbarApi.register({ id: "line-col", label: "Ln 1, Col 1", alignment: "right", priority: 100 });
  statusbarApi.register({ id: "encoding", label: "UTF-8", alignment: "right", priority: 80 });
  statusbarApi.register({ id: "language", label: "TypeScript", alignment: "right", priority: 70 });
  statusbarApi.register({ id: "spaces", label: "Spaces: 2", alignment: "right", priority: 60 });

  // Track cursor position for statusbar
  ide.editor.onDidChangeCursorPosition((e) => {
    statusbarApi.update("line-col", { label: `Ln ${e.position.lineNumber}, Col ${e.position.column}` });
  });

  // Show a welcome notification after boot
  notificationApi.show({
    type: "success",
    message: "Monaco Vanced loaded successfully!",
    duration: 4000,
  });

  // Expose for dev console (typed via global.d.ts)
  window.monaco = monaco;
  window.editor = ide.editor;
  window.engine = ide.engine;
  window.eventBus = ide.eventBus;
}

bootstrap().catch(console.error);
