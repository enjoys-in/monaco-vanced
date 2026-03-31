// ── Feature Flags Module — Types ──────────────────────────────

import type { IDisposable } from "@core/types";

export type FlagValue = boolean | string | number | Record<string, unknown>;

export interface FlagConfig {
  key: string;
  defaultValue: FlagValue;
  description?: string;
  source?: "local" | "remote" | "capability";
}

export interface FeatureFlagConfig {
  remoteUrl?: string;
  refreshInterval?: number;
}

export interface FeatureFlagModuleAPI {
  isEnabled(key: string): boolean;
  getValue(key: string): FlagValue | undefined;
  setOverride(key: string, value: FlagValue): void;
  removeOverride(key: string): void;
  getAll(): Map<string, FlagValue>;
  sync(): Promise<void>;
  register(config: FlagConfig): void;
  onChange(handler: (data?: unknown) => void): IDisposable;
}
