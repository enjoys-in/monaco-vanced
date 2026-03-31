// ── Keybinding Module — Types ──────────────────────────────────

import type { IDisposable } from "@core/types";

export interface KeyCombo {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
}

export interface Keybinding {
  key: string;
  command: string;
  when?: string;
  args?: unknown;
}

export interface KeybindingConflict {
  key: string;
  commands: string[];
}

export interface KeybindingConfig {
  customBindings?: Keybinding[];
}

export type KeybindingSource = "default" | "extension" | "user";

export interface ResolvedKeybinding extends Keybinding {
  source: KeybindingSource;
}

export interface KeybindingModuleAPI {
  register(binding: Keybinding, source?: KeybindingSource): IDisposable;
  unregister(key: string, command?: string): void;
  getAll(): ResolvedKeybinding[];
  getForCommand(cmdId: string): ResolvedKeybinding[];
  getConflicts(): KeybindingConflict[];
  resolve(event: KeyboardEvent): ResolvedKeybinding | null;
  importFromVSCode(json: string): number;
}
