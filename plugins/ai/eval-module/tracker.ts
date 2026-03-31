// ── Tracker ────────────────────────────────────────────────
// Tracks accept/reject/edit history for AI suggestion quality.

import type { EvalScore } from "./types";
import { computeScore } from "./scorer";

export class EvalTracker {
  private history: EvalScore[] = [];
  private maxSize: number;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  score(requestId: string, metrics: Record<string, number>): EvalScore {
    const entry: EvalScore = {
      id: `eval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      requestId,
      score: computeScore(metrics),
      metrics,
      timestamp: Date.now(),
    };
    this.history.push(entry);
    this.enforceLimit();
    return entry;
  }

  accept(requestId: string): void {
    this.setFeedback(requestId, "accepted");
  }

  reject(requestId: string): void {
    this.setFeedback(requestId, "rejected");
  }

  getAcceptRate(): number {
    const scored = this.history.filter((e) => e.feedback === "accepted" || e.feedback === "rejected");
    if (scored.length === 0) return 0;
    const accepted = scored.filter((e) => e.feedback === "accepted").length;
    return accepted / scored.length;
  }

  getHistory(): EvalScore[] {
    return [...this.history];
  }

  clear(): void {
    this.history = [];
  }

  private setFeedback(requestId: string, feedback: EvalScore["feedback"]): void {
    const entry = this.history.find((e) => e.requestId === requestId);
    if (entry) {
      (entry as { feedback: EvalScore["feedback"] }).feedback = feedback;
    }
  }

  private enforceLimit(): void {
    if (this.history.length > this.maxSize) {
      this.history = this.history.slice(-this.maxSize);
    }
  }
}
