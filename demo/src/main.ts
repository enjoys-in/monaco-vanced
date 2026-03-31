import "./style.css";
import * as monaco from "monaco-editor";
import { createMonacoIDE } from "@enjoys/monaco-vanced";
import type { MonacoVancedInstance } from "@enjoys/monaco-vanced";

// ── Monaco Workers ────────────────────────────────────────────
// Vite bundles these as separate worker files automatically.

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

// ── Plugins ──────────────────────────────────────────────────

import { createSettingsPlugin } from "@plugins/infrastructure/settings-module";
import { createNotificationPlugin } from "@plugins/infrastructure/notification-module";
import { createCommandPlugin } from "@plugins/infrastructure/command-module";
import { createKeybindingPlugin } from "@plugins/infrastructure/keybinding-module";
import { createThemePlugin } from "@plugins/theming/theme-module";

const { plugin: settingsPlugin } = createSettingsPlugin();
const { plugin: notificationPlugin, api: notificationApi } = createNotificationPlugin();
const { plugin: commandPlugin } = createCommandPlugin();
const { plugin: keybindingPlugin } = createKeybindingPlugin();
const { plugin: themePlugin } = createThemePlugin();

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
  ide = await createMonacoIDE({
    container: "#editor-container",
    monaco,
    plugins: [
      settingsPlugin,
      commandPlugin,
      keybindingPlugin,
      themePlugin,
      notificationPlugin,
    ],
    language: "typescript",
    value: editorOptions.value as string,
    editorOptions,
  });

  console.log("[monaco-vanced] IDE ready:", ide.engine.getRegisteredIds());

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
