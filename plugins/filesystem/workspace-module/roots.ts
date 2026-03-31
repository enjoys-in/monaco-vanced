// ── Workspace Module — Root Registry ──────────────────────────
// Manages the list of workspace roots and tracks the active root.

import type { FSAdapter } from "../fs-module/types";
import type { WorkspaceRoot } from "./types";

/**
 * In-memory registry of workspace roots.
 * Each root has an optional dedicated FS adapter.
 */
export class RootRegistry {
  private roots = new Map<string, WorkspaceRoot>();
  private activeRootPath: string | null = null;

  /** Add a root folder */
  add(path: string, name?: string, adapter?: FSAdapter, trusted = true): WorkspaceRoot {
    const root: WorkspaceRoot = {
      path,
      name: name ?? path.split("/").pop() ?? path,
      adapter,
      trusted,
    };
    this.roots.set(path, root);

    // Auto-set active if first root
    if (this.roots.size === 1) {
      this.activeRootPath = path;
    }
    return root;
  }

  /** Remove a root folder */
  remove(path: string): boolean {
    const existed = this.roots.delete(path);
    if (this.activeRootPath === path) {
      // Switch to next available root or null
      const first = this.roots.keys().next().value as string | undefined;
      this.activeRootPath = first ?? null;
    }
    return existed;
  }

  /** Get all roots */
  getAll(): WorkspaceRoot[] {
    return Array.from(this.roots.values());
  }

  /** Get a specific root */
  get(path: string): WorkspaceRoot | undefined {
    return this.roots.get(path);
  }

  /** Get the active root */
  getActive(): WorkspaceRoot | null {
    if (!this.activeRootPath) return null;
    return this.roots.get(this.activeRootPath) ?? null;
  }

  /** Set the active root */
  setActive(path: string): boolean {
    if (!this.roots.has(path)) return false;
    this.activeRootPath = path;
    return true;
  }

  /** Check if a root exists */
  has(path: string): boolean {
    return this.roots.has(path);
  }

  /** Number of roots */
  get size(): number {
    return this.roots.size;
  }

  /** Clear all roots */
  clear(): void {
    this.roots.clear();
    this.activeRootPath = null;
  }
}
