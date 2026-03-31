// ── Settings Module — Store ────────────────────────────────────
// 3-layer config: defaults → user → workspace (workspace wins).
//
// Storage strategy (like theme-store):
//   defaults  → in-memory only (shipped with modules, never persisted)
//   workspace → in-memory only (re-read from .vscode/settings.json each session)
//   user      → Dexie IndexedDB  (persistent across sessions, heavy data)
//
// All reads are synchronous from the in-memory maps.
// Only user-layer writes are flushed to IndexedDB in the background.

import Dexie, { type EntityTable } from "dexie";
import DotObject from "dot-object";
import type { SettingsLayer } from "./types";
import { SchemaRegistry } from "./schema-registry";

// ── Dexie DB (user layer only) ──────────────────────────────

interface UserSettingsRecord {
  key: string; // always "user"
  data: Record<string, unknown>;
  updatedAt: number;
}

class SettingsDB extends Dexie {
  userSettings!: EntityTable<UserSettingsRecord, "key">;

  constructor(name: string) {
    super(name);
    this.version(1).stores({ userSettings: "key" });
  }
}

// ── dot-object instance ──────────────────────────────────────

const dot = new DotObject(".");

// ── Store class ──────────────────────────────────────────────

export class SettingsStore {
  /** In-memory layers — all reads come from here. */
  private readonly layers: Record<SettingsLayer, Record<string, unknown>> = {
    defaults: {},
    user: {},
    workspace: {},
  };
  private readonly schemaRegistry: SchemaRegistry;
  private readonly db: SettingsDB;
  private restorePromise: Promise<void>;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(schemaRegistry: SchemaRegistry, persistKey = "monaco-vanced-settings") {
    this.schemaRegistry = schemaRegistry;
    this.db = new SettingsDB(persistKey);
    this.restorePromise = this.restoreUserLayer();
  }

  /** Wait for user layer restore from IndexedDB. */
  async ready(): Promise<void> {
    await this.restorePromise;
  }

  // ── Reads (all synchronous, in-memory) ────────────────────

  /**
   * Get a setting with full layer precedence.
   * Supports per-language overrides: "[python].editor.tabSize"
   */
  get<T = unknown>(key: string, layer?: SettingsLayer): T {
    if (layer) {
      return (this.layers[layer][key] ?? undefined) as T;
    }
    // workspace > user > defaults > schema default
    if (key in this.layers.workspace) return this.layers.workspace[key] as T;
    if (key in this.layers.user) return this.layers.user[key] as T;
    if (key in this.layers.defaults) return this.layers.defaults[key] as T;
    const schema = this.schemaRegistry.get(key);
    return (schema?.default ?? undefined) as T;
  }

  /**
   * Per-language override: checks "[langId].key" first, falls back to "key".
   */
  getForLanguage<T = unknown>(key: string, langId: string): T {
    const langKey = `[${langId}].${key}`;
    const langVal = this.get<T>(langKey);
    if (langVal !== undefined) return langVal;
    return this.get<T>(key);
  }

  /**
   * Get all settings under a dot-path namespace prefix.
   * e.g. getNamespace("editor") → { "editor.fontSize": 14, ... }
   */
  getNamespace(namespace: string): Record<string, unknown> {
    const merged = this.getMerged();
    const prefix = namespace + ".";
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(merged)) {
      if (key.startsWith(prefix) || key === namespace) {
        result[key] = value;
      }
    }
    return result;
  }

  /** Merged view of all layers (defaults < user < workspace). */
  getMerged(): Record<string, unknown> {
    const schemaDefaults = this.schemaRegistry.getDefaults();
    return {
      ...schemaDefaults,
      ...this.layers.defaults,
      ...this.layers.user,
      ...this.layers.workspace,
    };
  }

  /** Raw copy of a single layer. */
  getLayer(layer: SettingsLayer): Record<string, unknown> {
    return { ...this.layers[layer] };
  }

  // ── Writes ────────────────────────────────────────────────

  set(key: string, value: unknown, layer: SettingsLayer = "user"): unknown {
    const old = this.get(key);
    this.layers[layer][key] = value;
    if (layer === "user") this.persistUserLayer();
    return old;
  }

  reset(key: string, layer?: SettingsLayer): void {
    if (layer) {
      delete this.layers[layer][key];
    } else {
      delete this.layers.workspace[key];
      delete this.layers.user[key];
      delete this.layers.defaults[key];
    }
    this.persistUserLayer();
  }

  /** Seed defaults layer — in-memory only, never persisted. */
  setDefaults(defaults: Record<string, unknown>): void {
    Object.assign(this.layers.defaults, defaults);
  }

  /**
   * Import workspace settings from .vscode/settings.json content.
   * In-memory only — workspace layer is transient per session.
   */
  importWorkspace(nested: Record<string, unknown>): number {
    return this.importNested(nested, "workspace");
  }

  /** Convert a nested JSON object to flat dot-path keys and merge into a layer. */
  importNested(nested: Record<string, unknown>, layer: SettingsLayer): number {
    const flat = dot.dot(nested) as Record<string, unknown>;
    // Handle per-language overrides: keys like "[python]" hold sub-objects
    for (const [key, value] of Object.entries(nested)) {
      if (key.startsWith("[") && key.endsWith("]") && typeof value === "object" && value !== null) {
        for (const [subKey, subVal] of Object.entries(value as Record<string, unknown>)) {
          flat[`${key}.${subKey}`] = subVal;
        }
      }
    }
    let count = 0;
    for (const [key, value] of Object.entries(flat)) {
      this.layers[layer][key] = value;
      count++;
    }
    if (layer === "user") this.persistUserLayer();
    return count;
  }

  /** Export a layer as flat dot-notation object. */
  exportLayer(layer: SettingsLayer): Record<string, unknown> {
    return { ...this.layers[layer] };
  }

  // ── Dexie persistence (user layer only) ───────────────────

  /** Debounced write to IndexedDB — batches rapid changes. */
  private persistUserLayer(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.db.userSettings
        .put({ key: "user", data: { ...this.layers.user }, updatedAt: Date.now() })
        .catch(() => console.warn("[settings-store] Failed to persist user settings to IndexedDB"));
    }, 200);
  }

  /** Restore user layer from IndexedDB on boot. */
  private async restoreUserLayer(): Promise<void> {
    try {
      const record = await this.db.userSettings.get("user");
      if (record?.data) Object.assign(this.layers.user, record.data);
    } catch {
      console.warn("[settings-store] Failed to restore user settings from IndexedDB");
    }
  }

  clear(): void {
    this.layers.defaults = {};
    this.layers.user = {};
    this.layers.workspace = {};
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.db.userSettings.clear().catch(() => {});
  }
}
