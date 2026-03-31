// ── Eval Module Types ──────────────────────────────────────

export interface EvalScore {
  readonly id: string;
  readonly requestId: string;
  readonly score: number; // 0–1
  readonly metrics: Record<string, number>;
  readonly feedback?: "accepted" | "rejected" | "edited" | "ignored";
  readonly timestamp: number;
}

export interface EvalConfig {
  readonly historySize?: number;
  readonly autoTrack?: boolean;
}

export interface EvalModuleAPI {
  score(requestId: string, metrics: Record<string, number>): EvalScore;
  accept(requestId: string): void;
  reject(requestId: string): void;
  getAcceptRate(): number;
  getHistory(): EvalScore[];
  clear(): void;
}
