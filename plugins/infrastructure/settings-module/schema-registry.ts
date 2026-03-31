// ── Settings Module — Schema Registry ──────────────────────────

import type { SettingSchema, SettingSchemaRegistration, SettingsCategory } from "./types";

export class SchemaRegistry {
  private readonly schemas = new Map<string, SettingSchema>();

  register(schema: SettingSchema): void {
    this.schemas.set(schema.key, schema);
  }

  /**
   * Bulk-register from a namespace object (spec format).
   * Converts { namespace: "eslint", schema: { "eslint.enable": { type, default, ... } } }
   * into individual SettingSchema entries.
   */
  registerNamespace(reg: SettingSchemaRegistration): void {
    for (const [key, def] of Object.entries(reg.schema)) {
      this.schemas.set(key, {
        key,
        ...def,
      });
    }
  }

  unregister(key: string): boolean {
    return this.schemas.delete(key);
  }

  get(key: string): SettingSchema | undefined {
    return this.schemas.get(key);
  }

  getAll(): SettingSchema[] {
    return Array.from(this.schemas.values());
  }

  /** Get all schemas for a given category. */
  getByCategory(category: SettingsCategory): SettingSchema[] {
    return this.getAll().filter((s) => s.category === category);
  }

  /** Get all schemas under a dot-path namespace prefix (e.g. "editor"). */
  getByNamespace(namespace: string): SettingSchema[] {
    const prefix = namespace + ".";
    return this.getAll().filter((s) => s.key.startsWith(prefix) || s.key === namespace);
  }

  has(key: string): boolean {
    return this.schemas.has(key);
  }

  getDefaults(): Record<string, unknown> {
    const defaults: Record<string, unknown> = {};
    for (const schema of this.schemas.values()) {
      defaults[schema.key] = schema.default;
    }
    return defaults;
  }

  clear(): void {
    this.schemas.clear();
  }
}
