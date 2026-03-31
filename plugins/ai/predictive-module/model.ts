// ── Frequency Model ────────────────────────────────────────
// Tracks frequency + recency for prediction scoring.

import type { PredictionRecord } from "./types";

export class FrequencyModel {
  private records = new Map<string, PredictionRecord>();
  private decayFactor: number;
  private maxRecords: number;
  private persistKey: string | undefined;

  constructor(
    type: "file" | "command",
    maxRecords = 500,
    decayFactor = 0.95,
    persistKey?: string,
  ) {
    this.decayFactor = decayFactor;
    this.maxRecords = maxRecords;
    this.persistKey = persistKey ? `${persistKey}:${type}` : undefined;
    this.restore();
    this._type = type;
  }

  private _type: "file" | "command";

  record(value: string): void {
    const existing = this.records.get(value);
    const now = Date.now();

    if (existing) {
      const updated: PredictionRecord = {
        ...existing,
        frequency: existing.frequency + 1,
        lastUsed: now,
        score: this.computeScore(existing.frequency + 1, now),
      };
      this.records.set(value, updated);
    } else {
      const rec: PredictionRecord = {
        id: `pred-${now}-${Math.random().toString(36).slice(2, 8)}`,
        type: this._type,
        value,
        score: this.computeScore(1, now),
        lastUsed: now,
        frequency: 1,
      };
      this.records.set(value, rec);
    }

    this.enforceLimit();
    this.persist();
  }

  predict(limit = 5): PredictionRecord[] {
    const now = Date.now();
    const scored = Array.from(this.records.values()).map((r) => ({
      ...r,
      score: this.computeScore(r.frequency, now, r.lastUsed),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  getCount(): number {
    return this.records.size;
  }

  clear(): void {
    this.records.clear();
    this.persist();
  }

  private computeScore(frequency: number, now: number, lastUsed?: number): number {
    const age = lastUsed ? (now - lastUsed) / (1000 * 60 * 60) : 0; // hours
    const recencyWeight = Math.pow(this.decayFactor, age);
    return frequency * recencyWeight;
  }

  private enforceLimit(): void {
    if (this.records.size <= this.maxRecords) return;
    const sorted = Array.from(this.records.entries()).sort((a, b) => a[1].score - b[1].score);
    const toRemove = sorted.slice(0, sorted.length - this.maxRecords);
    for (const [key] of toRemove) {
      this.records.delete(key);
    }
  }

  private persist(): void {
    if (!this.persistKey) return;
    try {
      const data = Array.from(this.records.values());
      localStorage.setItem(this.persistKey, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  private restore(): void {
    if (!this.persistKey) return;
    try {
      const raw = localStorage.getItem(this.persistKey);
      if (!raw) return;
      const data = JSON.parse(raw) as PredictionRecord[];
      for (const rec of data) {
        this.records.set(rec.value, rec);
      }
    } catch {
      // ignore
    }
  }
}
