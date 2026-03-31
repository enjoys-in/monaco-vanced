// ── Presence ───────────────────────────────────────────────
// Tracks connected users and their cursor positions.

import type { CollabUser, CursorPosition } from "./types";

export class PresenceTracker {
  private users = new Map<string, CollabUser>();
  private cursors = new Map<string, CursorPosition>();

  addUser(user: CollabUser): void {
    this.users.set(user.id, user);
  }

  removeUser(userId: string): void {
    this.users.delete(userId);
    this.cursors.delete(userId);
  }

  updateCursor(cursor: CursorPosition): void {
    this.cursors.set(cursor.userId, cursor);
  }

  getUsers(): CollabUser[] {
    return Array.from(this.users.values());
  }

  getCursors(): CursorPosition[] {
    return Array.from(this.cursors.values());
  }

  clear(): void {
    this.users.clear();
    this.cursors.clear();
  }
}
