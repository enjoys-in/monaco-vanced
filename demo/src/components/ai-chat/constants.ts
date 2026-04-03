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

// ── Symbol kind → codicon SVG icon (VS Code style) ───────────
const S = (d: string) => `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">${d}</svg>`;
const SYMBOL_ICONS: Record<string, string> = {
  file:          S(`<path d="M13.71 4.29l-3-3L10 1H4L3 2v12l1 1h8l1-1V5l-.29-.71zM13 14H4V2h5v4h4v8z"/>`),
  module:        S(`<path d="M8 1L1 4.5v7L8 15l7-3.5v-7L8 1zm0 1.12L13.15 5 8 7.88 2.85 5 8 2.12zM2 11V5.88l5.5 2.75V14L2 11zm6.5 3V8.63L14 5.88V11l-5.5 3z"/>`),
  namespace:     S(`<path d="M8 1L1 4.5v7L8 15l7-3.5v-7L8 1zm0 1.12L13.15 5 8 7.88 2.85 5 8 2.12zM2 11V5.88l5.5 2.75V14L2 11zm6.5 3V8.63L14 5.88V11l-5.5 3z"/>`),
  package:       S(`<path d="M8 1L1 4.5v7L8 15l7-3.5v-7L8 1zm0 1.12L13.15 5 8 7.88 2.85 5 8 2.12zM2 11V5.88l5.5 2.75V14L2 11zm6.5 3V8.63L14 5.88V11l-5.5 3z"/>`),
  class:         S(`<path d="M11.34 3.3l-3.54-2.2h-.6L3.66 3.3l-.36.6v4.2l.36.6 3.54 2.2h.6l3.54-2.2.36-.6V3.9l-.36-.6zm-.7 4.5L8 9.6 5.36 7.8V4.2L8 2.4l2.64 1.8v3.6z"/><path d="M8.5 10.7v2.8l3.54-2.2.36-.6V8.5L8.5 10.7z"/><path d="M7.5 10.7L3.6 8.5v2.2l.36.6L7.5 13.5V10.7z"/>`),
  method:        S(`<path d="M13.51 4l-5-3h-1l-5 3-.49.86v6l.49.85 5 3h1l5-3 .49-.85v-6L13.51 4zm-6 9.56l-4.5-2.7V5.7l4.5 2.45v5.41zM3.27 4.7L7.5 2.08l4.23 2.63L7.5 7.25 3.27 4.71zm9.23 6.16l-4.5 2.7V8.15l4.5-2.45v5.16z"/>`),
  property:      S(`<path d="M2 3h2v1H2V3zm4 0h8v1H6V3zM2 6h2v1H2V6zm4 0h8v1H6V6zM2 9h2v1H2V9zm4 0h8v1H6V9zM2 12h2v1H2v-1zm4 0h8v1H6v-1z"/>`),
  field:         S(`<path d="M2 3h2v1H2V3zm4 0h8v1H6V3zM2 6h2v1H2V6zm4 0h8v1H6V6zM2 9h2v1H2V9zm4 0h8v1H6V9zM2 12h2v1H2v-1zm4 0h8v1H6v-1z"/>`),
  constructor:   S(`<path d="M13.51 4l-5-3h-1l-5 3-.49.86v6l.49.85 5 3h1l5-3 .49-.85v-6L13.51 4zm-6 9.56l-4.5-2.7V5.7l4.5 2.45v5.41zM3.27 4.7L7.5 2.08l4.23 2.63L7.5 7.25 3.27 4.71zm9.23 6.16l-4.5 2.7V8.15l4.5-2.45v5.16z"/>`),
  enum:          S(`<path d="M14 3H8l-1 1v3l1 1h6l1-1V4l-1-1zm0 4H8V4h6v3zM7 8H1L0 9v3l1 1h6l1-1V9L7 8zm0 4H1V9h6v3zm7-1h-6l-1 1v3l1 1h6l1-1v-3l-1-1zm0 4H8v-3h6v3z"/>`),
  interface:     S(`<path d="M11.496 4a3.49 3.49 0 00-3.46 3h-3.1a2 2 0 100 1h3.1a3.5 3.5 0 103.46-4zm0 6a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>`),
  function:      S(`<path d="M4.46 5h1.4l-.64 2.72H6.7l.14-.57h.71l-.14.57.62-.01-.18.7H7.3L6.8 10.4c-.17.71-.56 1.13-1.28 1.13-.16 0-.38-.03-.56-.07l.16-.67c.1.02.21.04.32.04.33 0 .47-.2.57-.6L6.5 8.41H5.07l.17-.7h1.41l.5-2.12a1.2 1.2 0 011.21-1.03c.17 0 .39.04.56.08l-.16.66a1.2 1.2 0 00-.3-.04c-.33 0-.47.2-.56.61L7.44 7.7h1.51l-.16.7H7.31l-.52 2z"/>`),
  variable:      S(`<path d="M2 5h12v2H2V5zm3 4h6v2H5V9z"/>`),
  constant:      S(`<path d="M4 6h8v1H4V6zm0 3h8v1H4V9z"/><rect x="3" y="2" width="10" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1"/>`),
  string:        S(`<path d="M5.5 4A1.5 1.5 0 004 5.5v1A1.5 1.5 0 005.5 8h.25a.25.25 0 01.25.25V9a2 2 0 01-2 2h-.5v1H4a3 3 0 003-3V5.5A1.5 1.5 0 005.5 4zm5 0A1.5 1.5 0 009 5.5v1A1.5 1.5 0 0010.5 8h.25a.25.25 0 01.25.25V9a2 2 0 01-2 2h-.5v1h.5a3 3 0 003-3V5.5A1.5 1.5 0 0010.5 4z"/>`),
  number:        S(`<path d="M4.42 7h1.95l.47-2.4h1L7.37 7h2l.47-2.4h1L10.37 7H12v1h-1.83l-.39 2H12v1h-2.42l-.47 2.4h-1l.47-2.4h-2l-.47 2.4h-1l.47-2.4H4v-1h1.83l.39-2H4v-1zm2.75 1l-.39 2h2l.39-2h-2z"/>`),
  boolean:       S(`<path d="M5 3a5 5 0 000 10h6a5 5 0 000-10H5zm0 1h6a4 4 0 010 8H5a4 4 0 010-8zm6 2a2 2 0 100 4 2 2 0 000-4z"/>`),
  array:         S(`<path d="M2 2h4v1H3v10h3v1H2V2zm8 0h4v12h-4v-1h3V3h-3V2z"/>`),
  object:        S(`<path d="M2 3l1-1h3v1H3.6L3 3.6V7h2v1H3v3.4l.6.6H6v1H3l-1-1V9H1V7h1V3zm12 0l-1-1h-3v1h2.4l.6.6V7h-2v1h2v3.4l-.6.6H10v1h3l1-1V9h1V7h-1V3z"/>`),
  key:           S(`<path d="M10 3a4 4 0 00-3.87 3H2v2h.5v2h2V8H6v.13A4 4 0 1010 3zm0 6a2 2 0 110-4 2 2 0 010 4z"/>`),
  null:          S(`<path d="M3 3h10v10H3V3zm1 1v8h8V4H4zm2 3h4v2H6V7z"/>`),
  enummember:    S(`<path d="M14 3H8l-1 1v3l1 1h6l1-1V4l-1-1zm0 4H8V4h6v3z"/>`),
  struct:        S(`<path d="M1 2h14v3H1V2zm0 4.5h6.5V10H1V6.5zm7.5 0H15V10H8.5V6.5zM1 11.5h14v3H1v-3z"/>`),
  event:         S(`<path d="M7.414 1L9 3.586V7l-1.707 1.707L9 10.414 7.414 12 4 8.586l2.293-2.293L5 5V1h2.414zM6 2v2.586l1.707 1.707L6 8l2 2 1.293-1.293L11 7V3.414L9.586 2H6z"/>`),
  operator:      S(`<path d="M2 7h12v2H2V7zm3-4h6v2H5V3zm0 8h6v2H5v-2z"/>`),
  typeparameter: S(`<path d="M3 3h10l1 1v3l-1 1H9v5H7V8H3L2 7V4l1-1zm0 4h10V4H3v3z"/>`),
  type:          S(`<path d="M3 3h10l1 1v3l-1 1H9v5H7V8H3L2 7V4l1-1zm0 4h10V4H3v3z"/>`),
  import:        S(`<path d="M8 1L1 4.5v7L8 15l7-3.5v-7L8 1zm0 1.12L13.15 5 8 7.88 2.85 5 8 2.12zM2 11V5.88l5.5 2.75V14L2 11zm6.5 3V8.63L14 5.88V11l-5.5 3z"/>`),
};

/** Get a VS Code-style codicon SVG for a symbol kind */
export function symbolKindIcon(kind: string): string {
  return SYMBOL_ICONS[kind.toLowerCase()] || SYMBOL_ICONS.variable;
}

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
