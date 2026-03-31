// ── Workspace Module — Per-Root Scope ─────────────────────────
// Isolates settings and state per workspace root.

import type { WorkspaceRoot } from "./types";

/** Per-root scoped settings (workspace > user > default) */
export interface ScopeSettings {
  /** Workspace-level overrides for this root */
  workspace: Record<string, unknown>;
  /** Computed merged settings (workspace + global) */
  merged: Record<string, unknown>;
}

/**
 * Manages per-root scoped settings and state isolation.
 * Each workspace root can have its own settings that override globals.
 */
export class ScopeManager {
  private scopes = new Map<string, ScopeSettings>();
  private globalSettings: Record<string, unknown> = {};

  /** Set global (user-level) settings — applied to all roots as base */
  setGlobalSettings(settings: Record<string, unknown>): void {
    this.globalSettings = { ...settings };
    // Recompute all merged settings
    for (const [path, scope] of this.scopes) {
      this.scopes.set(path, {
        ...scope,
        merged: { ...this.globalSettings, ...scope.workspace },
      });
    }
  }

  /** Initialize scope for a root */
  initScope(root: WorkspaceRoot, workspaceSettings?: Record<string, unknown>): void {
    const workspace = workspaceSettings ?? {};
    this.scopes.set(root.path, {
      workspace,
      merged: { ...this.globalSettings, ...workspace },
    });
  }

  /** Get merged settings for a root */
  getSettings(rootPath: string): Record<string, unknown> {
    return this.scopes.get(rootPath)?.merged ?? { ...this.globalSettings };
  }

  /** Update workspace-level settings for a root */
  updateWorkspaceSettings(rootPath: string, settings: Record<string, unknown>): void {
    const existing = this.scopes.get(rootPath);
    const workspace = { ...(existing?.workspace ?? {}), ...settings };
    this.scopes.set(rootPath, {
      workspace,
      merged: { ...this.globalSettings, ...workspace },
    });
  }

  /** Remove scope for a root */
  removeScope(rootPath: string): void {
    this.scopes.delete(rootPath);
  }

  /** Clear all scopes */
  clear(): void {
    this.scopes.clear();
  }
}
