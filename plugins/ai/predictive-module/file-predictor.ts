// ── File Predictor ─────────────────────────────────────────
// Predicts likely next files based on navigation patterns.

import { FrequencyModel } from "./model";

export class FilePredictor {
  private model: FrequencyModel;

  constructor(maxRecords?: number, decayFactor?: number, persistKey?: string) {
    this.model = new FrequencyModel("file", maxRecords, decayFactor, persistKey);
  }

  record(filePath: string): void {
    this.model.record(filePath);
  }

  predict(limit?: number) {
    return this.model.predict(limit);
  }

  getCount(): number {
    return this.model.getCount();
  }

  clear(): void {
    this.model.clear();
  }
}
