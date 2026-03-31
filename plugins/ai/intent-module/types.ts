// ── Intent Module Types ────────────────────────────────────

export type IntentType =
  | "typing-fast"
  | "typing-slow"
  | "idle"
  | "error-detected"
  | "focus-change"
  | "pattern-match";

export interface IntentSignal {
  readonly type: IntentType;
  readonly confidence: number; // 0–1
  readonly timestamp: number;
  readonly data?: Record<string, unknown>;
}

export interface IntentConfig {
  readonly idleTimeout?: number;    // ms, default 5000
  readonly fastWpm?: number;        // default 80
  readonly slowWpm?: number;        // default 20
  readonly patternWindow?: number;  // ms for pattern detection window
}

export interface IntentModuleAPI {
  onKeystroke(): void;
  onIdle(): void;
  onError(diagnostic: { file: string; message: string; severity: string }): void;
  onFocusChange(panelId: string): void;
  getLastSignal(): IntentSignal | null;
  getSignals(since?: number): IntentSignal[];
}
