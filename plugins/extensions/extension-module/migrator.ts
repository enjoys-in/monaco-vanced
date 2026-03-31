// ── Extension Module — Migrator ──────────────────────────────

import type { Extension } from "./types";

export interface MigrationStep {
  fromVersion: string;
  toVersion: string;
  migrate: (extension: Extension) => void | Promise<void>;
  description?: string;
}

export class ExtensionMigrator {
  private migrations = new Map<string, MigrationStep[]>();

  /** Register a migration step for an extension */
  registerMigration(extensionId: string, step: MigrationStep): void {
    const steps = this.migrations.get(extensionId) ?? [];
    steps.push(step);
    // Sort by fromVersion ascending
    steps.sort((a, b) => this.compareVersions(a.fromVersion, b.fromVersion));
    this.migrations.set(extensionId, steps);
  }

  /** Run all applicable migrations from fromVersion to toVersion */
  async migrate(extension: Extension, fromVersion: string, toVersion: string): Promise<void> {
    const steps = this.migrations.get(extension.manifest.id);
    if (!steps) return;

    const applicable = steps.filter(
      (s) =>
        this.compareVersions(s.fromVersion, fromVersion) >= 0 &&
        this.compareVersions(s.toVersion, toVersion) <= 0,
    );

    for (const step of applicable) {
      try {
        await step.migrate(extension);
      } catch (err) {
        console.error(
          `[extension-migrator] migration failed for ${extension.manifest.id} ` +
            `(${step.fromVersion} → ${step.toVersion}):`,
          err,
        );
        throw err;
      }
    }
  }

  /** Check if migrations exist for an extension between versions */
  hasMigrations(extensionId: string, fromVersion: string, toVersion: string): boolean {
    const steps = this.migrations.get(extensionId);
    if (!steps) return false;
    return steps.some(
      (s) =>
        this.compareVersions(s.fromVersion, fromVersion) >= 0 &&
        this.compareVersions(s.toVersion, toVersion) <= 0,
    );
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
