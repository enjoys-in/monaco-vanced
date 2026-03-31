// ── Keybinding Module — Conflict Detector ─────────────────────

import type { Keybinding, KeybindingConflict } from "./types";
import { normalizeKey } from "./parser";

export class ConflictDetector {
  detect(bindings: Keybinding[]): KeybindingConflict[] {
    const keyMap = new Map<string, Set<string>>();

    for (const binding of bindings) {
      const normalized = normalizeKey(binding.key);
      if (!keyMap.has(normalized)) {
        keyMap.set(normalized, new Set());
      }
      keyMap.get(normalized)!.add(binding.command);
    }

    const conflicts: KeybindingConflict[] = [];
    for (const [key, commands] of keyMap) {
      if (commands.size > 1) {
        conflicts.push({ key, commands: Array.from(commands) });
      }
    }

    return conflicts;
  }

  hasConflict(key: string, bindings: Keybinding[]): boolean {
    const normalized = normalizeKey(key);
    const matching = bindings.filter((b) => normalizeKey(b.key) === normalized);
    const uniqueCommands = new Set(matching.map((b) => b.command));
    return uniqueCommands.size > 1;
  }

  getConflictsForKey(key: string, bindings: Keybinding[]): string[] {
    const normalized = normalizeKey(key);
    return bindings
      .filter((b) => normalizeKey(b.key) === normalized)
      .map((b) => b.command);
  }
}
