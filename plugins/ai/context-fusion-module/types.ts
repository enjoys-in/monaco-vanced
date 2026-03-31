// ── Context Fusion Types ───────────────────────────────────

export interface FusionSource {
  readonly id: string;
  readonly priority: number; // lower = more important
  gather(): Promise<string> | string;
}

export interface FusionStrategy {
  readonly id: string;
  readonly sources: string[]; // source ids to use
  readonly tokenBudget: number;
}

export interface FusionResult {
  readonly text: string;
  readonly tokenCount: number;
  readonly sourcesUsed: string[];
  readonly truncated: boolean;
}

export interface FusionConfig {
  readonly defaultBudget?: number;
}

export interface ContextFusionAPI {
  registerSource(source: FusionSource): void;
  removeSource(id: string): void;
  registerStrategy(strategy: FusionStrategy): void;
  gather(strategyId?: string): Promise<FusionResult>;
  getSources(): FusionSource[];
  getStrategies(): FusionStrategy[];
}
