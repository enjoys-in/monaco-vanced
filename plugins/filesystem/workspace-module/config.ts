// ── Workspace Module — Config Parser ──────────────────────────
// Parses .monaco-workspace.json files.

import type { WorkspaceConfig, WorkspaceFolderConfig } from "./types";

/**
 * Parse a raw JSON string into a WorkspaceConfig.
 * Validates the structure and provides defaults.
 */
export function parseWorkspaceConfig(raw: string): WorkspaceConfig | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (!parsed.folders || !Array.isArray(parsed.folders)) {
      return null;
    }

    const folders: WorkspaceFolderConfig[] = (parsed.folders as unknown[])
      .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
      .map((f) => ({
        path: String(f.path ?? ""),
        name: f.name ? String(f.name) : undefined,
      }))
      .filter((f) => f.path.length > 0);

    if (folders.length === 0) return null;

    return {
      folders,
      settings: typeof parsed.settings === "object" && parsed.settings !== null
        ? parsed.settings as Record<string, unknown>
        : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Serialize a WorkspaceConfig to JSON string.
 */
export function serializeWorkspaceConfig(config: WorkspaceConfig): string {
  return JSON.stringify(config, null, 2);
}
