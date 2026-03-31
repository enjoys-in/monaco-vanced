// ── Theme Module — Registry ──────────────────────────────────

import type { ThemeDefinition } from "./types";

export class ThemeRegistry {
  private themes = new Map<string, ThemeDefinition>();

  /** Register a theme */
  register(theme: ThemeDefinition): void {
    this.themes.set(theme.id, theme);
  }

  /** Get a theme by ID */
  get(id: string): ThemeDefinition | undefined {
    return this.themes.get(id);
  }

  /** Get all registered themes */
  getAll(): ThemeDefinition[] {
    return Array.from(this.themes.values());
  }

  /** Check if a theme is registered */
  has(id: string): boolean {
    return this.themes.has(id);
  }

  /** Remove a theme */
  remove(id: string): boolean {
    return this.themes.delete(id);
  }

  /** Get count */
  get size(): number {
    return this.themes.size;
  }
}
