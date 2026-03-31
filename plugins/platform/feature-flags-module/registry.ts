// ── Feature Flags Module — FlagRegistry ───────────────────────

import type { FlagConfig, FlagValue } from "./types";

export class FlagRegistry {
  private readonly flags = new Map<string, FlagConfig>();
  private readonly overrides = new Map<string, FlagValue>();
  private readonly remoteValues = new Map<string, FlagValue>();

  register(config: FlagConfig): void {
    this.flags.set(config.key, config);
  }

  get(key: string): FlagValue | undefined {
    // Override takes priority
    if (this.overrides.has(key)) return this.overrides.get(key);
    // Then remote
    if (this.remoteValues.has(key)) return this.remoteValues.get(key);
    // Then default
    return this.flags.get(key)?.defaultValue;
  }

  evaluate(key: string): boolean {
    const val = this.get(key);
    if (val === undefined) return false;
    return Boolean(val);
  }

  setOverride(key: string, value: FlagValue): void {
    this.overrides.set(key, value);
  }

  removeOverride(key: string): void {
    this.overrides.delete(key);
  }

  setRemoteValues(values: Map<string, FlagValue>): void {
    for (const [k, v] of values) {
      this.remoteValues.set(k, v);
    }
  }

  getAll(): Map<string, FlagValue> {
    const result = new Map<string, FlagValue>();
    for (const config of this.flags.values()) {
      result.set(config.key, this.get(config.key) ?? config.defaultValue);
    }
    return result;
  }

  getAllConfigs(): FlagConfig[] {
    return Array.from(this.flags.values());
  }
}
