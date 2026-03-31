// ── Settings Module — Types ────────────────────────────────────

import type { IDisposable } from "@core/types";

// ── Primitives ──────────────────────────────────────────────

export type SettingType = "string" | "number" | "boolean" | "object" | "array" | "enum";

export type SettingsLayer = "defaults" | "user" | "workspace";

// ── Schema ──────────────────────────────────────────────────

export interface SettingSchema {
  key: string;
  type: SettingType;
  default: unknown;
  description: string;
  scope?: SettingsLayer;
  enum?: unknown[];
  min?: number;
  max?: number;
  /** Category shown in Settings UI sidebar */
  category?: SettingsCategory;
}

/** Bulk registration used by modules in their init() */
export interface SettingSchemaRegistration {
  namespace: string;
  schema: Record<string, Omit<SettingSchema, "key">>;
}

export type SettingsCategory =
  | "themes"
  | "editor"
  | "snippets"
  | "keybindings"
  | "account"
  | "command palette"
  | "layout"
  | "extensions"
  | "language"
  | "terminal"
  | "linting"
  | "formatting";

// ── Config ──────────────────────────────────────────────────

export interface SettingsConfig {
  persistKey?: string;
}

// ── Events ──────────────────────────────────────────────────

export interface SettingsChangeEvent {
  key: string;
  value: unknown;
  previousValue: unknown;
  layer: SettingsLayer;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ── Snippets ────────────────────────────────────────────────

export interface SnippetDefinition {
  prefix: string;
  body: string | string[];
  description?: string;
}

export type SnippetFile = Record<string, SnippetDefinition>;

// ── Module API (spec-compliant) ─────────────────────────────

export interface SettingsModuleAPI {
  get<T = unknown>(key: string, layer?: SettingsLayer): T;
  set<T = unknown>(key: string, value: T, layer?: SettingsLayer): void;
  reset(key: string, layer?: SettingsLayer): void;
  getAll(namespace: string): Record<string, unknown>;
  watch(key: string, cb: (value: unknown) => void): IDisposable;
  register(schema: SettingSchemaRegistration): void;
  export(layer: SettingsLayer): string;
  import(json: string, layer: SettingsLayer): void;
  openUI(section?: string): void;
  openJSON(layer?: SettingsLayer): void;

  // ── Extras (kept from v1) ─────────────────────────────
  getSchema(key: string): SettingSchema | undefined;
  validate(key: string, value: unknown): ValidationResult;
  registerSnippets(language: string, snippets: SnippetFile): void;
}
