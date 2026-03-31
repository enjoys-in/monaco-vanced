// ── Settings Module — Migration ────────────────────────────────

export interface MigrationStep {
  fromVersion: number;
  toVersion: number;
  migrate: (settings: Record<string, unknown>) => Record<string, unknown>;
}

export class SettingsMigrator {
  private readonly steps: MigrationStep[] = [];

  addStep(step: MigrationStep): void {
    this.steps.push(step);
    this.steps.sort((a, b) => a.fromVersion - b.fromVersion);
  }

  migrate(
    settings: Record<string, unknown>,
    migrations: MigrationStep[],
    fromVersion: number,
    toVersion: number,
  ): Record<string, unknown> {
    let current = { ...settings };
    let version = fromVersion;

    const applicable = migrations
      .filter((m) => m.fromVersion >= fromVersion && m.toVersion <= toVersion)
      .sort((a, b) => a.fromVersion - b.fromVersion);

    for (const step of applicable) {
      if (step.fromVersion === version) {
        try {
          current = step.migrate(current);
          version = step.toVersion;
        } catch (e) {
          console.error(`[settings-migrator] Migration ${step.fromVersion} → ${step.toVersion} failed:`, e);
          break;
        }
      }
    }

    current.__settingsVersion = version;
    return current;
  }

  getSteps(): MigrationStep[] {
    return [...this.steps];
  }

  getLatestVersion(): number {
    if (this.steps.length === 0) return 0;
    return Math.max(...this.steps.map((s) => s.toVersion));
  }
}
