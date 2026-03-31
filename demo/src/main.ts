import "./style.css";
import * as monaco from "monaco-editor";
import { createMonacoIDE } from "@enjoys/monaco-vanced";
import type { MonacoVancedInstance } from "@enjoys/monaco-vanced";

// ── Default editor options (overridable via settings.json / Settings UI) ──

const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  value: [
    "// Welcome to Monaco Vanced",
    "// A plugin-based IDE built on Monaco Editor",
    "",
    'console.log("Hello, world!");',
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
    plugins: [
      // Add plugins here as they are implemented:
      // createEditorPlugin(),
      // createTabsPlugin(),
    ],
    language: "typescript",
    value: editorOptions.value as string,
    editorOptions,
  });

  console.log("[monaco-vanced] IDE ready:", ide.engine.getRegisteredIds());

  // Expose for dev console (typed via global.d.ts)
  window.monaco = monaco;
  window.editor = ide.editor;
  window.engine = ide.engine;
  window.eventBus = ide.eventBus;
}

bootstrap().catch(console.error);
