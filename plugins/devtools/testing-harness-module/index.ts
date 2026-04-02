// ── Testing Harness Module — Plugin Entry ─────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import { EventBus } from "@core/event-bus";
import type {
  TestingHarnessConfig,
  TestingHarnessModuleAPI,
  MockEventBus,
  PluginTestContext,
  TestSuiteRegistration,
  SuiteResult,
  TestResult,
} from "./types";
import { TestingHarnessEvents } from "@core/events";

export type {
  TestingHarnessConfig,
  TestingHarnessModuleAPI,
  MockEventBus,
  PluginTestContext,
  TestSuiteRegistration,
  SuiteResult,
  TestResult,
} from "./types";

export function createTestingHarnessPlugin(config: TestingHarnessConfig = {}): {
  plugin: MonacoPlugin;
  api: TestingHarnessModuleAPI;
} {
  const timeout = config.timeout ?? 5000;
  const suites = new Map<string, TestSuiteRegistration>();
  let ctx: PluginContext | null = null;

  function createMockEventBus(): MockEventBus {
    const bus = new EventBus();
    const emitted: Array<{ event: string; args: unknown[] }> = [];

    const origEmit = bus.emit.bind(bus);
    bus.emit = (event: string, ...args: unknown[]) => {
      emitted.push({ event, args });
      return origEmit(event, ...args);
    };

    return {
      emitted,
      spy(event: string): unknown[] {
        return emitted.filter((e) => e.event === event).map((e) => e.args);
      },
      clear() {
        emitted.length = 0;
      },
      bus,
    };
  }

  const api: TestingHarnessModuleAPI = {
    createTestContext(): PluginTestContext {
      const mockBus = createMockEventBus();
      const disposables: IDisposable[] = [];

      return {
        eventBus: mockBus,
        dispose() {
          for (const d of disposables) d.dispose();
          disposables.length = 0;
        },
      };
    },

    registerSuite(suite: TestSuiteRegistration): void {
      suites.set(suite.id, suite);
      ctx?.emit(TestingHarnessEvents.SuiteRegistered, { id: suite.id, name: suite.name, testCount: suite.tests.length });
    },

    async runSuite(suiteId: string): Promise<SuiteResult> {
      const suite = suites.get(suiteId);
      if (!suite) throw new Error(`Suite "${suiteId}" not found`);

      ctx?.emit(TestingHarnessEvents.SuiteStarted, { id: suiteId });
      const suiteStart = performance.now();
      const results: TestResult[] = [];

      for (const test of suite.tests) {
        const testStart = performance.now();
        try {
          const result = test.fn();
          if (result instanceof Promise) {
            await Promise.race([
              result,
              new Promise((_, reject) => setTimeout(() => reject(new Error(`Test "${test.name}" timed out after ${timeout}ms`)), timeout)),
            ]);
          }
          results.push({ testId: test.id, passed: true, durationMs: performance.now() - testStart });
        } catch (err) {
          results.push({ testId: test.id, passed: false, error: String(err), durationMs: performance.now() - testStart });
        }
      }

      const passed = results.filter((r) => r.passed).length;
      const failed = results.filter((r) => !r.passed).length;
      const suiteResult: SuiteResult = { suiteId, results, passed, failed, durationMs: performance.now() - suiteStart };

      ctx?.emit(TestingHarnessEvents.SuiteCompleted, suiteResult);
      return suiteResult;
    },

    async runAll(): Promise<SuiteResult[]> {
      const allResults: SuiteResult[] = [];
      for (const [id] of suites) {
        allResults.push(await api.runSuite(id));
      }
      return allResults;
    },

    getSuites(): TestSuiteRegistration[] {
      return [...suites.values()];
    },

    createSpy<T extends (...args: unknown[]) => unknown>(fn?: T): T & { calls: unknown[][]; callCount: number; reset(): void } {
      const calls: unknown[][] = [];
      const spy = ((...args: unknown[]) => {
        calls.push(args);
        return fn?.(...args);
      }) as T & { calls: unknown[][]; callCount: number; reset(): void };
      Object.defineProperty(spy, "calls", { get: () => calls });
      Object.defineProperty(spy, "callCount", { get: () => calls.length });
      spy.reset = () => { calls.length = 0; };
      ctx?.emit(TestingHarnessEvents.MockCreated, { type: "spy" });
      return spy;
    },

    assert(condition: boolean, message?: string): void {
      if (!condition) throw new Error(message ?? "Assertion failed");
    },

    createDisposable(): IDisposable & { disposed: boolean } {
      let disposed = false;
      return {
        get disposed() { return disposed; },
        dispose() { disposed = true; },
      };
    },
  };

  const plugin: MonacoPlugin = {
    id: "testing-harness-module",
    name: "Testing Harness Module",
    version: "1.0.0",
    description: "Test utilities for plugin authors — mock event bus, test runner, spies",

    onMount(pluginCtx) {
      ctx = pluginCtx;
    },

    onDispose() {
      suites.clear();
      ctx = null;
    },
  };

  return { plugin, api };
}
