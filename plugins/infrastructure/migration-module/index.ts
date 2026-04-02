// ── Migration Module — Plugin Entry ───────────────────────────

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { MigrationConfig, MigrationModuleAPI, MigrationStep, MigrationRecord } from "./types";
import { MigrationEvents } from "@core/events";

export type { MigrationConfig, MigrationModuleAPI, MigrationStep, MigrationRecord } from "./types";

export function createMigrationPlugin(config: MigrationConfig = {}): {
  plugin: MonacoPlugin;
  api: MigrationModuleAPI;
} {
  const storageKey = config.storageKey ?? "monaco-vanced:migrations";
  const steps: MigrationStep[] = [];
  const history: MigrationRecord[] = [];
  let ctx: PluginContext | null = null;

  function loadHistory(): void {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as MigrationRecord[];
        history.length = 0;
        history.push(...parsed);
      }
    } catch { /* ignore */ }
  }

  function saveHistory(): void {
    try {
      localStorage.setItem(storageKey, JSON.stringify(history));
    } catch { /* ignore */ }
  }

  function getAppliedIds(): Set<string> {
    return new Set(history.filter((r) => r.status === "completed").map((r) => r.stepId));
  }

  const api: MigrationModuleAPI = {
    register(step: MigrationStep): void {
      if (!steps.some((s) => s.id === step.id)) {
        steps.push(step);
        // Keep steps sorted by version
        steps.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
      }
    },

    async migrate(): Promise<MigrationRecord[]> {
      loadHistory();
      const applied = getAppliedIds();
      const pending = steps.filter((s) => !applied.has(s.id));
      const records: MigrationRecord[] = [];

      if (pending.length === 0) return records;
      ctx?.emit(MigrationEvents.Started, { pending: pending.length });

      for (const step of pending) {
        const start = performance.now();
        const record: MigrationRecord = {
          stepId: step.id,
          version: step.version,
          status: "running",
          appliedAt: Date.now(),
          durationMs: 0,
        };

        try {
          await step.up();
          record.status = "completed";
          record.durationMs = performance.now() - start;
          ctx?.emit(MigrationEvents.StepCompleted, { stepId: step.id, version: step.version });
        } catch (err) {
          record.status = "failed";
          record.error = String(err);
          record.durationMs = performance.now() - start;
          ctx?.emit(MigrationEvents.Failed, { stepId: step.id, error: record.error });
          history.push(record);
          records.push(record);
          saveHistory();
          break; // Stop on first failure
        }

        history.push(record);
        records.push(record);
      }

      saveHistory();
      if (records.every((r) => r.status === "completed")) {
        ctx?.emit(MigrationEvents.Completed, { count: records.length });
      }
      return records;
    },

    async rollback(count = 1): Promise<MigrationRecord[]> {
      loadHistory();
      const completed = history.filter((r) => r.status === "completed");
      const toRollback = completed.slice(-count).reverse();
      const records: MigrationRecord[] = [];

      for (const record of toRollback) {
        const step = steps.find((s) => s.id === record.stepId);
        if (!step) continue;

        const start = performance.now();
        try {
          await step.down();
          record.status = "rolled-back";
          record.durationMs = performance.now() - start;
          ctx?.emit(MigrationEvents.Rollback, { stepId: step.id, version: step.version });
          records.push({ ...record });
        } catch (err) {
          record.status = "failed";
          record.error = String(err);
          record.durationMs = performance.now() - start;
          records.push({ ...record });
          break;
        }
      }

      saveHistory();
      return records;
    },

    getHistory(): MigrationRecord[] {
      loadHistory();
      return [...history];
    },

    getCurrentVersion(): string | null {
      loadHistory();
      const completed = history.filter((r) => r.status === "completed");
      return completed.length > 0 ? completed[completed.length - 1].version : null;
    },

    hasPending(): boolean {
      loadHistory();
      const applied = getAppliedIds();
      return steps.some((s) => !applied.has(s.id));
    },

    getSteps(): MigrationStep[] {
      return [...steps];
    },
  };

  const plugin: MonacoPlugin = {
    id: "migration-module",
    name: "Migration Module",
    version: "1.0.0",
    description: "Data migration and schema versioning",

    onMount(pluginCtx) {
      ctx = pluginCtx;
      loadHistory();
    },

    onDispose() {
      steps.length = 0;
      history.length = 0;
      ctx = null;
    },
  };

  return { plugin, api };
}
