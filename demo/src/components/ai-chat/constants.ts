// ── AI Chat — Constants & Helpers ────────────────────────────

import type { SlashCommand, SuggestionPrompt } from "./types";

// ── SVG Icons ────────────────────────────────────────────────
export const SparkleIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l1.7 4.3L14 7l-4.3 1.7L8 13l-1.7-4.3L2 7l4.3-1.7L8 1z"/></svg>`;
export const SendIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 1.5l14 6.5-14 6.5V9l10-1-10-1V1.5z"/></svg>`;
export const StopIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="3" width="10" height="10" rx="1"/></svg>`;
export const CloseIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8.707l3.646 3.647.708-.708L8.707 8l3.647-3.646-.708-.708L8 7.293 4.354 3.646l-.708.708L7.293 8l-3.647 3.646.708.708L8 8.707z"/></svg>`;
export const ClearIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.11 9.34l-.71.71L8 8.71l-2.4 2.34-.71-.71L7.29 8 4.89 5.66l.71-.71L8 7.29l2.4-2.34.71.71L8.71 8l2.4 2.34z"/></svg>`;
export const AttachIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M11.006 3.73l-4.97 4.97a1.496 1.496 0 002.117 2.117l5.678-5.677a2.992 2.992 0 00-4.232-4.232L3.92 6.587a4.487 4.487 0 006.348 6.348l.007-.007 4.97-4.97-.707-.707-4.97 4.97-.007.007a3.488 3.488 0 01-4.934-4.934l5.678-5.678a1.992 1.992 0 112.818 2.818L7.454 11.11a.496.496 0 01-.703-.703l4.97-4.97-.707-.707z"/></svg>`;
export const FileIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.71 4.29l-3-3L10 1H4L3 2v12l1 1h8l1-1V5l-.29-.71zM13 14H4V2h5v4h4v8z"/></svg>`;
export const SymbolIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11.5 1h-7L3 2.5v11l1.5 1.5h7l1.5-1.5v-11L11.5 1zM11 13H5V3h6v10z"/><path d="M7 5h2v1H7V5zm0 2h3v1H7V7zm0 2h3v1H7V9z"/></svg>`;
export const SelectionIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v1H2V2zm0 3h12v1H2V5zm0 3h8v1H2V8zm0 3h10v1H2v-1z"/></svg>`;
export const HashIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3.5 2L2.5 8h3l-.5 3h-2l-.2 1h2l-.3 2h1l.3-2h2l-.3 2h1l.3-2h2l.2-1h-2l.5-3h2l.2-1h-2L7.7 2h-1L6.2 7h-2L4.5 2h-1zm3.2 5l-.5 3h-2l.5-3h2z"/></svg>`;

// ── Symbol kind → color ──────────────────────────────────────
const SYMBOL_COLORS: Record<string, string> = {
  file: "#d4d4d4", module: "#c586c0", namespace: "#c586c0", package: "#c586c0",
  class: "#4ec9b0", method: "#dcdcaa", property: "#9cdcfe", field: "#9cdcfe",
  constructor: "#dcdcaa", enum: "#b5cea8", interface: "#4ec9b0", function: "#dcdcaa",
  variable: "#9cdcfe", constant: "#4fc1ff", string: "#ce9178", number: "#b5cea8",
  boolean: "#569cd6", array: "#9cdcfe", object: "#4ec9b0", key: "#9cdcfe",
  null: "#569cd6", enummember: "#b5cea8", struct: "#4ec9b0", event: "#dcdcaa",
  operator: "#d4d4d4", typeparameter: "#4ec9b0", type: "#4ec9b0", import: "#c586c0",
};

export function symbolKindColor(kind: string): string {
  return SYMBOL_COLORS[kind.toLowerCase()] || "#d4d4d4";
}

// ── Symbol kind → short label ────────────────────────────────
const SYMBOL_LABELS: Record<string, string> = {
  file: "file", module: "mod", namespace: "ns", package: "pkg",
  class: "class", method: "fn", property: "prop", field: "field",
  constructor: "ctor", enum: "enum", interface: "iface", function: "fn",
  variable: "var", constant: "const", string: "str", number: "num",
  boolean: "bool", array: "arr", object: "obj", key: "key",
  null: "null", enummember: "emem", struct: "struct", event: "event",
  operator: "op", typeparameter: "tparam", type: "type", import: "imp",
};

export function symbolKindLabel(kind: string): string {
  return SYMBOL_LABELS[kind.toLowerCase()] || kind.slice(0, 4);
}

// ── File extension → color ───────────────────────────────────
const FILE_COLORS: Record<string, string> = {
  ts: "#3178c6", tsx: "#3178c6", js: "#f7df1e", jsx: "#f7df1e",
  css: "#264de4", html: "#e34c26", json: "#292929", md: "#083fa1",
  py: "#3572A5", rs: "#dea584", go: "#00ADD8", svg: "#ffb13b",
};

export function fileColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return FILE_COLORS[ext] || "#888";
}

// ── Slash command colors (same semantic as symbols) ──────────
export const SLASH_COMMANDS: SlashCommand[] = [
  { cmd: "/explain", description: "Explain the selected code", action: "explain", color: "#dcdcaa" },
  { cmd: "/fix", description: "Fix errors in the selected code", action: "fix", color: "#f44747" },
  { cmd: "/generate", description: "Generate code from a prompt", action: "generate", color: "#4ec9b0" },
  { cmd: "/tests", description: "Generate unit tests", action: "generate", color: "#b5cea8" },
  { cmd: "/refactor", description: "Suggest a refactoring", action: "explain", color: "#c586c0" },
  { cmd: "/clear", description: "Clear chat history", action: undefined, color: "#9cdcfe" },
  { cmd: "/new", description: "Start a new conversation", action: undefined, color: "#569cd6" },
];

// ── Suggested prompts ────────────────────────────────────────
export const SUGGESTIONS: SuggestionPrompt[] = [
  { label: "Explain this code", icon: "💡", prompt: "Explain the currently selected code in detail" },
  { label: "Fix errors", icon: "🔧", prompt: "Find and fix any bugs or errors in the selected code" },
  { label: "Generate tests", icon: "🧪", prompt: "Generate unit tests for the selected code" },
  { label: "Refactor", icon: "✨", prompt: "Suggest a cleaner refactoring for this code" },
];

// ── Markdown-lite renderer ───────────────────────────────────
export function renderContent(text: string): string {
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:rgba(0,0,0,0.3);padding:8px 10px;border-radius:4px;overflow-x:auto;margin:6px 0;font-size:12px;line-height:1.45"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.25);padding:1px 4px;border-radius:3px;font-size:12px">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, '<div style="padding-left:12px">• $1</div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div style="padding-left:12px">$1. $2</div>')
    .replace(/\n/g, "<br/>");
}

// ── Helpers: editor access ───────────────────────────────────
export function getEditorSelection(): string {
  const editor = window.editor as {
    getModel(): { getValueInRange(r: unknown): string } | null;
    getSelection(): { isEmpty(): boolean; startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } | null;
  } | undefined;
  if (!editor) return "";
  const model = editor.getModel();
  const sel = editor.getSelection();
  if (!model || !sel || sel.isEmpty()) return "";
  return model.getValueInRange(sel);
}

export function getEditorSelectionDetail(): { text: string; file: string; startLine: number; endLine: number } | null {
  const editor = window.editor as {
    getModel(): { getValueInRange(r: unknown): string; uri: { path: string } } | null;
    getSelection(): { isEmpty(): boolean; startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } | null;
  } | undefined;
  if (!editor) return null;
  const model = editor.getModel();
  const sel = editor.getSelection();
  if (!model || !sel || sel.isEmpty()) return null;
  return {
    text: model.getValueInRange(sel),
    file: model.uri.path.replace(/^\/+/, ""),
    startLine: sel.startLineNumber,
    endLine: sel.endLineNumber,
  };
}

export function getFileContent(uri: string): string | null {
  const monaco = window.monaco as {
    Uri: { parse(s: string): unknown };
    editor: { getModel(uri: unknown): { getValue(): string } | null };
  } | undefined;
  if (!monaco) return null;
  const monacoUri = monaco.Uri.parse(`file:///${uri}`);
  const model = monaco.editor.getModel(monacoUri);
  return model ? model.getValue() : null;
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
