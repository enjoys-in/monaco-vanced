// ── Settings Module — Plugin Entry ─────────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { SettingSchema, SettingsConfig, SettingsLayer, SettingsModuleAPI, ValidationResult } from "./types";
import { SchemaRegistry } from "./schema-registry";
import { SettingsStore } from "./store";
import { SettingsValidator } from "./validator";
import { SettingsJSONEditor } from "./json-editor";
import { SettingsWatcher } from "./watcher";

export type { SettingSchema, SettingsConfig, SettingsLayer, SettingsModuleAPI, SettingsChangeEvent, ValidationResult, SettingType } from "./types";
export { SchemaRegistry } from "./schema-registry";
export { SettingsStore } from "./store";
export { SettingsValidator } from "./validator";
export { SettingsJSONEditor } from "./json-editor";
export { SettingsMigrator, type MigrationStep } from "./migration";
export { SettingsWatcher } from "./watcher";

export function createSettingsPlugin(config: SettingsConfig = {}): {
  plugin: MonacoPlugin;
  api: SettingsModuleAPI;
} {
  const schemaRegistry = new SchemaRegistry();
  const store = new SettingsStore(schemaRegistry, config.persistKey);
  const validator = new SettingsValidator();
  const jsonEditor = new SettingsJSONEditor();
  const watcher = new SettingsWatcher();
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;

  const api: SettingsModuleAPI = {
    get<T = unknown>(key: string): T {
      return store.get<T>(key);
    },

    set(key: string, value: unknown, layer: SettingsLayer = "user"): void {
      const schema = schemaRegistry.get(key);
      if (schema) {
        const result = validator.validate(value, schema);
        if (!result.valid) {
          console.warn(`[settings] Validation failed for "${key}":`, result.errors);
          return;
        }
      }
      const oldValue = store.get(key);
      store.set(key, value, layer);
      watcher.notify({ key, oldValue, newValue: value, layer });
      ctx?.emit("settings:change", { key, oldValue, newValue: value, layer });
    },

    reset(key: string): void {
      const oldValue = store.get(key);
      store.reset(key);
      const newValue = store.get(key);
      watcher.notify({ key, oldValue, newValue, layer: "default" });
      ctx?.emit("settings:reset", { key });
    },

    getSchema(key: string): SettingSchema | undefined {
      return schemaRegistry.get(key);
    },

    registerSchema(schema: SettingSchema): IDisposable {
      schemaRegistry.register(schema);
      // Apply default if not already set
      const current = store.get(schema.key);
      if (current === undefined) {
        store.set(schema.key, schema.default, "default");
      }
      return {
        dispose() {
          schemaRegistry.unregister(schema.key);
        },
      };
    },

    getAll(layer?: SettingsLayer): Record<string, unknown> {
      return store.getAll(layer);
    },

    onSettingsChange(handler: (data?: unknown) => void): IDisposable {
      return watcher.watchAll((event) => handler(event));
    },

    validate(key: string, value: unknown): ValidationResult {
      const schema = schemaRegistry.get(key);
      if (!schema) return { valid: true, errors: [] };
      return validator.validate(value, schema);
    },

    exportJSON(): string {
      const all = store.getAll();
      return jsonEditor.serialize(all);
    },

    importJSON(json: string): number {
      const parsed = jsonEditor.parse(json);
      let count = 0;
      for (const [key, value] of Object.entries(parsed)) {
        api.set(key, value);
        count++;
      }
      return count;
    },
  };

  const plugin: MonacoPlugin = {
    id: "infrastructure.settings",
    name: "Settings Module",
    version: "1.0.0",
    description: "3-layer settings with schema validation and change watching",

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      disposables.push(
        ctx.on("settings:change", (data?: unknown) => {
          const d = data as { key?: string; value?: unknown; layer?: SettingsLayer } | undefined;
          if (d?.key !== undefined && d?.value !== undefined) {
            api.set(d.key, d.value, d.layer);
          }
        }),
      );

      disposables.push(
        ctx.on("settings:reset", (data?: unknown) => {
          const d = data as { key?: string } | undefined;
          if (d?.key) api.reset(d.key);
        }),
      );
    },

    onDispose() {
      disposables.forEach((d) => d.dispose());
      disposables.length = 0;
      watcher.dispose();
      ctx = null;
    },
  };

  return { plugin, api };
}
