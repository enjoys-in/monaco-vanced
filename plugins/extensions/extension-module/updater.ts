// ── Extension Module — Updater ───────────────────────────────

import type { Extension } from "./types";

export interface UpdateInfo {
  extensionId: string;
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
}

export class ExtensionUpdater {
  private registryUrl: string;

  constructor(registryUrl = "/api/extensions") {
    this.registryUrl = registryUrl;
  }

  /** Check for updates for a list of extensions */
  async checkForUpdates(extensions: Extension[]): Promise<UpdateInfo[]> {
    const results: UpdateInfo[] = [];

    for (const ext of extensions) {
      try {
        const response = await fetch(
          `${this.registryUrl}/${encodeURIComponent(ext.manifest.id)}/latest`,
        );
        if (!response.ok) {
          results.push({
            extensionId: ext.manifest.id,
            currentVersion: ext.manifest.version,
            latestVersion: ext.manifest.version,
            updateAvailable: false,
          });
          continue;
        }
        const data = (await response.json()) as { version: string };
        const updateAvailable = this.compareVersions(ext.manifest.version, data.version) < 0;
        results.push({
          extensionId: ext.manifest.id,
          currentVersion: ext.manifest.version,
          latestVersion: data.version,
          updateAvailable,
        });
      } catch {
        results.push({
          extensionId: ext.manifest.id,
          currentVersion: ext.manifest.version,
          latestVersion: ext.manifest.version,
          updateAvailable: false,
        });
      }
    }

    return results;
  }

  /** Apply an update to a specific extension */
  async applyUpdate(extensionId: string): Promise<{ code: string; version: string }> {
    const response = await fetch(
      `${this.registryUrl}/${encodeURIComponent(extensionId)}/latest/download`,
    );
    if (!response.ok) {
      throw new Error(`Failed to download update for "${extensionId}": ${response.statusText}`);
    }
    const data = (await response.json()) as { code: string; version: string };
    return data;
  }

  private compareVersions(a: string, b: string): number {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }
}
