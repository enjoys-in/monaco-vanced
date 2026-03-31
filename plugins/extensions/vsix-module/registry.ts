// ── VSIX Module — Registry ───────────────────────────────────

import type { VSIXManifest } from "./types";

interface RegistryEntry {
  manifest: VSIXManifest;
  installedAt: number;
}

export class VSIXRegistry {
  private entries = new Map<string, RegistryEntry>();

  /** Register an installed VSIX package */
  register(manifest: VSIXManifest): void {
    const id = `${manifest.publisher}.${manifest.name}`;
    this.entries.set(id, {
      manifest,
      installedAt: Date.now(),
    });
  }

  /** Unregister a VSIX by ID */
  unregister(id: string): boolean {
    return this.entries.delete(id);
  }

  /** Get all installed manifests */
  getAll(): VSIXManifest[] {
    return Array.from(this.entries.values()).map((e) => e.manifest);
  }

  /** Get a specific manifest by ID */
  get(id: string): VSIXManifest | undefined {
    return this.entries.get(id)?.manifest;
  }

  /** Check if an extension is installed */
  has(id: string): boolean {
    return this.entries.has(id);
  }

  /** Get count of installed extensions */
  get size(): number {
    return this.entries.size;
  }

  /** Clear all entries */
  clear(): void {
    this.entries.clear();
  }
}
