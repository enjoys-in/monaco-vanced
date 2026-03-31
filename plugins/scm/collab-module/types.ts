// ── Collab Module Types ────────────────────────────────────

export interface CollabUser {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly avatar?: string;
}

export interface CursorPosition {
  readonly userId: string;
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly selection?: { startLine: number; startColumn: number; endLine: number; endColumn: number };
}

export interface CollabOperation {
  readonly type: "insert" | "delete" | "retain";
  readonly position: number;
  readonly content?: string;
  readonly length?: number;
  readonly userId: string;
  readonly timestamp: number;
}

export interface CollabConfig {
  readonly serverUrl?: string;
  readonly roomId?: string;
}

export interface CollabModuleAPI {
  join(roomId: string, user: CollabUser): void;
  leave(): void;
  getUsers(): CollabUser[];
  getCursors(): CursorPosition[];
  sendOperation(op: CollabOperation): void;
  isConnected(): boolean;
}
