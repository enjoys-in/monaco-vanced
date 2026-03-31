// ── Command Module — Types ─────────────────────────────────────

import type { IDisposable } from "@core/types";

/** Context passed to every command/action handler at execution time. */
export interface ExecutionContext {
  editor: unknown;
  model: unknown;
  selection: unknown;
  selectedText: string;
  filePath: string;
  language: string;
  scheme: string;
}

export interface Command {
  id: string;
  label: string;
  handler: (ctx?: ExecutionContext, ...args: unknown[]) => void | Promise<void>;
  /** Alias for handler — used by plugin authors who prefer the Monaco convention. */
  run?: (ctx?: ExecutionContext, ...args: unknown[]) => void | Promise<void>;
  keybinding?: string;
  /** When-clause precondition string (e.g. "editorHasSelection && !editorReadonly"). */
  when?: string;
  category?: string;
  /** Metadata grouping tag (e.g. "ai", "git", "file"). */
  group?: string;
  /** Context menu group ID for Monaco's built-in editor context menu. */
  contextMenuGroup?: string;
  /** Order within the context menu group (lower = higher). */
  contextMenuOrder?: number;
  /** Whether the command is currently enabled (default true). */
  enabled?: boolean;
}

/** Action definition for context-menu-specific registrations. */
export interface ActionDefinition {
  id: string;
  label: string;
  handler: (ctx?: ExecutionContext) => void | Promise<void>;
  target: "editor" | "explorer" | "both";
  group: string;
  order: number;
  precondition?: string;
  icon?: string;
}

export interface CommandConfig {
  maxHistory?: number;
}

export interface CommandHistoryEntry {
  id: string;
  args?: unknown[];
  timestamp: number;
}

export interface CommandModuleAPI {
  register(cmd: Command): IDisposable;
  execute(id: string, ...args: unknown[]): Promise<void>;
  getAll(): Command[];
  search(query: string): Command[];
  getHistory(): CommandHistoryEntry[];
  enable(id: string): void;
  disable(id: string): void;
  isEnabled(id: string): boolean;
  /** Registers all commands with the given Monaco editor instance via addAction(). */
  bindToEditor(editor: unknown): IDisposable;
  onBeforeExecute(handler: (data?: unknown) => void): IDisposable;
  onAfterExecute(handler: (data?: unknown) => void): IDisposable;
}
