// ── Command Predictor ──────────────────────────────────────
// Predicts likely next commands from history.

import { FrequencyModel } from "./model";

export class CommandPredictor {
  private model: FrequencyModel;

  constructor(maxRecords?: number, decayFactor?: number, persistKey?: string) {
    this.model = new FrequencyModel("command", maxRecords, decayFactor, persistKey);
  }

  record(command: string): void {
    this.model.record(command);
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
