// ── Crash Recovery Module — StateSnapshot ─────────────────────

import type { EditorState } from "./types";

export class StateSnapshot {
  private readonly storageKey: string;

  constructor(storageKey = "monaco-editor-state") {
    this.storageKey = storageKey;
  }

  capture(state: EditorState): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (e) {
      console.warn("[state-snapshot] Failed to save:", e);
    }
  }

  restore(): EditorState | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as EditorState;
    } catch {
      return null;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {}
  }
}
