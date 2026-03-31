// ── Test Module — Plugin Entry ────────────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type {
  TestItem,
  TestSuite,
  CoverageReport,
  TestConfig,
  TestModuleAPI,
} from "./types";
import { TestDiscovery } from "./discovery";
import { TestRunner } from "./runner";
import { CoverageCollector } from "./coverage";

export type {
  TestItem,
  TestSuite,
  CoverageReport,
  TestConfig,
  TestModuleAPI,
  TestState,
  TestFramework,
} from "./types";
export type { RawCoverageData } from "./coverage";
export { TestDiscovery } from "./discovery";
export { TestRunner } from "./runner";
export { CoverageCollector } from "./coverage";

// ── Factory ──────────────────────────────────────────────────

export function createTestPlugin(config: TestConfig = {}): {
  plugin: MonacoPlugin;
  api: TestModuleAPI;
} {
  const discovery = new TestDiscovery(config.framework ?? "vitest");
  const runner = new TestRunner(config);
  const coverage = new CoverageCollector();
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;
  let suites: TestSuite[] = [];
  let lastResults: TestItem[] = [];

  // ── API ──────────────────────────────────────────────────

  const api: TestModuleAPI = {
    async discover(rootPath: string): Promise<TestSuite[]> {
      // Emit discovery request — the FS module would resolve files
      ctx?.emit("test:discover:start", { rootPath });

      // In a real implementation, we'd read files from the FS adapter.
      // Here we store discovered suites for later runs.
      // External consumers can call this with pre-resolved file data.
      suites = await discovery.discoverTests([]);
      ctx?.emit("test:discover:complete", { count: suites.length });
      return suites;
    },

    async run(ids?: string[]): Promise<TestItem[]> {
      ctx?.emit("test:run", { ids });

      lastResults = await runner.run(suites, ids, (test) => {
        if (test.state === "passed") {
          ctx?.emit("test:complete", { test });
        } else if (test.state === "failed") {
          ctx?.emit("test:fail", { test });
        }
      });

      ctx?.emit("test:run:complete", {
        total: lastResults.length,
        passed: lastResults.filter((t) => t.state === "passed").length,
        failed: lastResults.filter((t) => t.state === "failed").length,
      });

      return lastResults;
    },

    async runAll(): Promise<TestItem[]> {
      return api.run();
    },

    getResults(): TestItem[] {
      return [...lastResults];
    },

    getCoverage(): CoverageReport[] {
      return coverage.getReports();
    },

    cancel(): void {
      runner.cancel();
      ctx?.emit("test:cancel", {});
    },
  };

  // ── Plugin ─────────────────────────────────────────────────

  const plugin: MonacoPlugin = {
    id: "test-module",
    name: "Test Runner",
    version: "1.0.0",
    description: "Test discovery, execution, and coverage reporting",

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      disposables.push(
        ctx.on("test:run", (data?: unknown) => {
          const d = data as { ids?: string[] } | undefined;
          api.run(d?.ids);
        }),
      );

      disposables.push(
        ctx.on("test:cancel", () => {
          api.cancel();
        }),
      );
    },

    onDispose() {
      runner.cancel();
      coverage.clear();
      suites = [];
      lastResults = [];
      for (const d of disposables) d.dispose();
      disposables.length = 0;
      ctx = null;
    },
  };

  return { plugin, api };
}
