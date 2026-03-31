// ── Settings Module — JSON Editor ──────────────────────────────

export class SettingsJSONEditor {
  parse(json: string): Record<string, unknown> {
    try {
      const parsed = JSON.parse(json);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("Settings JSON must be an object");
      }
      return parsed as Record<string, unknown>;
    } catch (e) {
      throw new Error(`Invalid settings JSON: ${(e as Error).message}`);
    }
  }

  serialize(settings: Record<string, unknown>, pretty = true): string {
    return JSON.stringify(settings, null, pretty ? 2 : 0);
  }

  validate(json: string): { valid: boolean; error?: string } {
    try {
      this.parse(json);
      return { valid: true };
    } catch (e) {
      return { valid: false, error: (e as Error).message };
    }
  }

  merge(base: Record<string, unknown>, overlay: Record<string, unknown>): Record<string, unknown> {
    const result = { ...base };
    for (const [key, value] of Object.entries(overlay)) {
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        typeof result[key] === "object" &&
        result[key] !== null &&
        !Array.isArray(result[key])
      ) {
        result[key] = this.merge(
          result[key] as Record<string, unknown>,
          value as Record<string, unknown>,
        );
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  diff(
    a: Record<string, unknown>,
    b: Record<string, unknown>,
  ): Record<string, { old: unknown; new: unknown }> {
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of allKeys) {
      if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
        changes[key] = { old: a[key], new: b[key] };
      }
    }
    return changes;
  }
}
