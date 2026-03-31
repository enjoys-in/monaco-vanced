// ── Extension Module — Manifest Validator ────────────────────

import type { ExtensionManifest } from "./types";

const SEMVER_RE = /^\d+\.\d+\.\d+(-[\w.]+)?$/;

const REQUIRED_FIELDS: (keyof ExtensionManifest)[] = [
  "id",
  "name",
  "version",
  "publisher",
  "engines",
  "activationEvents",
];

const VALID_PERMISSIONS = [
  "fs:read",
  "fs:write",
  "network",
  "clipboard",
  "terminal",
  "editor",
  "themes",
  "languages",
  "commands",
  "keybindings",
  "snippets",
];

export function validateManifest(json: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!json || typeof json !== "object") {
    return { valid: false, errors: ["Manifest must be a non-null object"] };
  }

  const manifest = json as Record<string, unknown>;

  // Required fields
  for (const field of REQUIRED_FIELDS) {
    if (manifest[field] == null || manifest[field] === "") {
      errors.push(`Missing required field: "${field}"`);
    }
  }

  // ID format
  if (typeof manifest.id === "string" && !/^[\w.-]+$/.test(manifest.id)) {
    errors.push(`Invalid id format: "${manifest.id}" — must be alphanumeric with dots, hyphens, underscores`);
  }

  // Version format
  if (typeof manifest.version === "string" && !SEMVER_RE.test(manifest.version)) {
    errors.push(`Invalid version format: "${manifest.version}" — must be semver (x.y.z)`);
  }

  // Engines
  if (manifest.engines != null) {
    if (typeof manifest.engines !== "object" || !(manifest.engines as Record<string, unknown>).monacoVanced) {
      errors.push('engines must contain "monacoVanced" field');
    }
  }

  // Activation events
  if (manifest.activationEvents != null) {
    if (!Array.isArray(manifest.activationEvents)) {
      errors.push("activationEvents must be an array");
    }
  }

  // Permissions
  if (manifest.permissions != null) {
    if (!Array.isArray(manifest.permissions)) {
      errors.push("permissions must be an array");
    } else {
      for (const perm of manifest.permissions as string[]) {
        if (!VALID_PERMISSIONS.includes(perm)) {
          errors.push(`Unknown permission: "${perm}"`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
