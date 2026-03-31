// ── Cursor Overlay ─────────────────────────────────────────
// Remote cursor rendering as decorations.

import type { CursorPosition, CollabUser } from "./types";

export interface CursorDecoration {
  readonly userId: string;
  readonly userName: string;
  readonly color: string;
  readonly line: number;
  readonly column: number;
}

export function buildCursorDecorations(
  cursors: CursorPosition[],
  users: Map<string, CollabUser>,
): CursorDecoration[] {
  return cursors.map((c) => {
    const user = users.get(c.userId);
    return {
      userId: c.userId,
      userName: user?.name ?? "Unknown",
      color: user?.color ?? "#888",
      line: c.line,
      column: c.column,
    };
  });
}
