// ── Settings Module — Schema Registry ──────────────────────────

import type { SettingSchema } from "./types";

export class SchemaRegistry {
  private readonly schemas = new Map<string, SettingSchema>();

  register(schema: SettingSchema): void {
    this.schemas.set(schema.key, schema);
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
