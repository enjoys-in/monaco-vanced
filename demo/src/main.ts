import "./style.css";
import * as monaco from "monaco-editor";
import { PluginEngine, EventBus } from "@enjoys/monaco-vanced";

// ── Bootstrap ─────────────────────────────────────────────────

const eventBus = new EventBus();
const engine = new PluginEngine(eventBus);

// ── Monaco Editor instance ────────────────────────────────────

const editorContainer = document.getElementById("editor-container")!;

const editor = monaco.editor.create(editorContainer, {
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
  padding: { top: 12 },
});

// ── Init plugins ──────────────────────────────────────────────

engine.initAll().then(() => {
  console.log("[monaco-vanced] Plugins initialized:", engine.getRegisteredIds());
});

// ── Expose for dev console ────────────────────────────────────

Object.assign(window, { monaco, editor, engine, eventBus });
