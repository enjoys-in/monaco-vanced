// ── Scorer ─────────────────────────────────────────────────
// Computes a composite quality score from individual metrics.

export function computeScore(metrics: Record<string, number>): number {
  const values = Object.values(metrics);
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.max(0, Math.min(1, sum / values.length));
}
