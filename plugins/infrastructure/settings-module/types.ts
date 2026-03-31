// ── Settings Module — Types ────────────────────────────────────

import type { IDisposable } from "@core/types";

export type SettingType = "string" | "number" | "boolean" | "object" | "array";

export type SettingsLayer = "default" | "user" | "workspace";

export interface SettingSchema {
  key: string;
  type: SettingType;
  default: unknown;
  description: string;
  scope?: SettingsLayer;
  enum?: unknown[];
  min?: number;
  max?: number;
}

export interface SettingsConfig {
  persistKey?: string;
}

export interface SettingsChangeEvent {
  key: string;
  oldValue: unknown;
  newValue: unknown;
  layer: SettingsLayer;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface SettingsModuleAPI {
  get<T = unknown>(key: string): T;
  set(key: string, value: unknown, layer?: SettingsLayer): void;
  reset(key: string): void;
  getSchema(key: string): SettingSchema | undefined;
  registerSchema(schema: SettingSchema): IDisposable;
  getAll(layer?: SettingsLayer): Record<string, unknown>;
  onSettingsChange(handler: (data?: unknown) => void): IDisposable;
  validate(key: string, value: unknown): ValidationResult;
  exportJSON(): string;
  importJSON(json: string): number;
}
