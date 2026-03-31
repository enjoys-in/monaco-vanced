// ── Command Module — Types ─────────────────────────────────────

import type { IDisposable } from "@core/types";

export interface Command {
  id: string;
  label: string;
  handler: (...args: unknown[]) => void | Promise<void>;
  keybinding?: string;
  when?: string;
  category?: string;
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
  onBeforeExecute(handler: (data?: unknown) => void): IDisposable;
  onAfterExecute(handler: (data?: unknown) => void): IDisposable;
}
