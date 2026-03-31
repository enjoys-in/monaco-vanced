// ── Settings Module — Store ────────────────────────────────────
// 3-layer config: default → user → workspace (workspace wins).

import type { SettingsLayer } from "./types";
import { SchemaRegistry } from "./schema-registry";

export class SettingsStore {
  private readonly layers: Record<SettingsLayer, Record<string, unknown>> = {
    default: {},
    user: {},
    workspace: {},
  };
  private readonly persistKey: string;
  private readonly schemaRegistry: SchemaRegistry;

  constructor(schemaRegistry: SchemaRegistry, persistKey = "monaco-vanced-settings") {
    this.schemaRegistry = schemaRegistry;
    this.persistKey = persistKey;
    this.restore();
  }

  get<T = unknown>(key: string): T {
    // Workspace > user > default > schema default
    if (key in this.layers.workspace) return this.layers.workspace[key] as T;
    if (key in this.layers.user) return this.layers.user[key] as T;
    if (key in this.layers.default) return this.layers.default[key] as T;
    const schema = this.schemaRegistry.get(key);
    return (schema?.default ?? undefined) as T;
  }

  set(key: string, value: unknown, layer: SettingsLayer = "user"): unknown {
    const old = this.get(key);
    this.layers[layer][key] = value;
    this.persist();
    return old;
  }

  reset(key: string): void {
    delete this.layers.workspace[key];
    delete this.layers.user[key];
    delete this.layers.default[key];
    this.persist();
  }

  getAll(layer?: SettingsLayer): Record<string, unknown> {
    if (layer) return { ...this.layers[layer] };
    // Merge all layers
    const merged: Record<string, unknown> = {};
    const defaults = this.schemaRegistry.getDefaults();
    Object.assign(merged, defaults, this.layers.default, this.layers.user, this.layers.workspace);
    return merged;
  }

  getLayer(layer: SettingsLayer): Record<string, unknown> {
    return { ...this.layers[layer] };
  }

  setDefaults(defaults: Record<string, unknown>): void {
    Object.assign(this.layers.default, defaults);
  }

  private persist(): void {
    try {
      const data = {
        user: this.layers.user,
        workspace: this.layers.workspace,
      };
      localStorage.setItem(this.persistKey, JSON.stringify(data));
    } catch {
      console.warn("[settings-store] Failed to persist settings");
    }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(this.persistKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.user) Object.assign(this.layers.user, data.user);
      if (data.workspace) Object.assign(this.layers.workspace, data.workspace);
    } catch {
      console.warn("[settings-store] Failed to restore settings");
    }
  }

  clear(): void {
    this.layers.default = {};
    this.layers.user = {};
    this.layers.workspace = {};
    localStorage.removeItem(this.persistKey);
  }
}
