// ── Workspace Module — Shared Types ───────────────────────────
// Multi-root workspace management.
// See context/advanced-modules.txt #59

import type { FSAdapter } from "../fs-module/types";

// ── Workspace root ────────────────────────────────────────────

export interface WorkspaceRoot {
  /** Absolute path of the root folder */
  path: string;
  /** Display name */
  name: string;
  /** FS adapter for this root (if separate from global) */
  adapter?: FSAdapter;
  /** Whether this root is trusted */
  trusted: boolean;
}

// ── Workspace config (.monaco-workspace.json) ─────────────────

export interface WorkspaceFolderConfig {
  path: string;
  name?: string;
}

export interface WorkspaceConfig {
  folders: WorkspaceFolderConfig[];
  settings?: Record<string, unknown>;
}

// ── Events ────────────────────────────────────────────────────

export enum WorkspaceEvents {
  RootAdded = "workspace:root-added",
  RootRemoved = "workspace:root-removed",
  RootChanged = "workspace:root-changed",
  ConfigChanged = "workspace:config-changed",
}

// ── Plugin options ────────────────────────────────────────────

export interface WorkspacePluginOptions {
  /** Initial roots (can be empty — user adds via UI) */
  roots?: WorkspaceRoot[];
  /** Path to .monaco-workspace.json (auto-loaded if present) */
  configPath?: string;
  /** Default trust level for new roots (default: true) */
  trustByDefault?: boolean;
}

// ── Workspace Module API ──────────────────────────────────────

export interface WorkspaceModuleAPI {
  getRoots(): WorkspaceRoot[];
  addRoot(path: string, name?: string, adapter?: FSAdapter): void;
  removeRoot(path: string): void;
  getActiveRoot(): WorkspaceRoot | null;
  setActiveRoot(path: string): void;
  getConfig(): WorkspaceConfig | null;
  isTrusted(path: string): boolean;
  setTrusted(path: string, trusted: boolean): void;
}
