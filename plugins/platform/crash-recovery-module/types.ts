// ── Crash Recovery Module — Types ─────────────────────────────

import type { IDisposable } from "@core/types";

export interface CrashReport {
  timestamp: number;
  reason: string;
  lastEvents: string[];
  activePlugins: string[];
  stackTrace?: string;
}

export interface RecoveryConfig {
  bufferIntervalMs?: number;
  maxCrashCount?: number;
  crashWindowMs?: number;
  persistKey?: string;
}

export interface EditorState {
  tabs: string[];
  cursors: Array<{ file: string; line: number; column: number }>;
  scrollPositions: Array<{ file: string; top: number }>;
  layout?: Record<string, unknown>;
}

export interface CrashRecoveryModuleAPI {
  saveBuffer(file: string, content: string): void;
  getUnsavedFiles(): Map<string, string>;
  clearRecovery(): void;
  getCrashReport(): CrashReport | null;
  isSafeMode(): boolean;
  enableSafeMode(): void;
  onRecovery(handler: (data?: unknown) => void): IDisposable;
}
