// ── Predictive Module Types ────────────────────────────────

export interface PredictionRecord {
  readonly id: string;
  readonly type: "file" | "command";
  readonly value: string;
  readonly score: number;
  readonly lastUsed: number;
  readonly frequency: number;
}

export interface PredictiveConfig {
  readonly maxPredictions?: number;
  readonly persistKey?: string;
  readonly decayFactor?: number; // 0–1, recency decay
}

export interface PredictiveModuleAPI {
  recordFile(filePath: string): void;
  recordCommand(command: string): void;
  predictFiles(limit?: number): PredictionRecord[];
  predictCommands(limit?: number): PredictionRecord[];
  preload(filePaths: string[]): void;
  getStats(): { files: number; commands: number };
  clear(): void;
}
