// ── Settings Module — Validator ────────────────────────────────

import type { SettingSchema, ValidationResult } from "./types";

export class SettingsValidator {
  validate(value: unknown, schema: SettingSchema): ValidationResult {
    const errors: string[] = [];

    // Type check
    if (!this.checkType(value, schema.type)) {
      errors.push(`Expected type "${schema.type}", got "${typeof value}"`);
      return { valid: false, errors };
    }

    // Enum validation
    if (schema.enum && schema.enum.length > 0) {
      if (!schema.enum.includes(value)) {
        errors.push(`Value must be one of: ${schema.enum.join(", ")}`);
      }
    }

    // Range checks for numbers
    if (schema.type === "number" && typeof value === "number") {
      if (schema.min !== undefined && value < schema.min) {
        errors.push(`Value must be >= ${schema.min}`);
      }
      if (schema.max !== undefined && value > schema.max) {
        errors.push(`Value must be <= ${schema.max}`);
      }
    }

    // String length (reuse min/max for length)
    if (schema.type === "string" && typeof value === "string") {
      if (schema.min !== undefined && value.length < schema.min) {
        errors.push(`String length must be >= ${schema.min}`);
      }
      if (schema.max !== undefined && value.length > schema.max) {
        errors.push(`String length must be <= ${schema.max}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private checkType(value: unknown, expected: string): boolean {
    switch (expected) {
      case "string":
        return typeof value === "string";
      case "number":
        return typeof value === "number" && !Number.isNaN(value);
      case "boolean":
        return typeof value === "boolean";
      case "object":
        return typeof value === "object" && value !== null && !Array.isArray(value);
      case "array":
        return Array.isArray(value);
      default:
        return true;
    }
  }
}
