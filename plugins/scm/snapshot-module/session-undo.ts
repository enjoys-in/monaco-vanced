// ── Session Undo ───────────────────────────────────────────
// Cross-session undo stack persisted in localStorage.

import type { SessionState } from "./types";

const SESSION_KEY = "monaco-vanced:session-state";

export function saveSessionState(state: SessionState): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function restoreSessionState(): SessionState | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionState;
  } catch {
    return null;
  }
}

export function clearSessionState(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
}
