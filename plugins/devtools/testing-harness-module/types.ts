// ── Testing Harness Module — Types ───────────────────────────

import type { IDisposable } from "@core/types";
import type { EventBus } from "@core/event-bus";

export interface MockEventBus {
  /** All emitted events during the test */
  emitted: Array<{ event: string; args: unknown[] }>;
  /** Spy on a specific event — returns captured payloads */
  spy(event: string): unknown[];
  /** Clear all captured events */
  clear(): void;
  /** The real EventBus wrapped for testing */
  bus: EventBus;
}

export interface PluginTestContext {
  /** A mock event bus that tracks all emitted events */
  eventBus: MockEventBus;
  /** Cleanup all resources */
  dispose(): void;
}

export interface TestSuiteRegistration {
  id: string;
  name: string;
  tests: TestCase[];
}

export interface TestCase {
  id: string;
  name: string;
  fn: () => void | Promise<void>;
}

export interface TestResult {
  testId: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export interface SuiteResult {
  suiteId: string;
  results: TestResult[];
  passed: number;
  failed: number;
  durationMs: number;
}

export interface TestingHarnessConfig {
  timeout?: number;
}

export interface TestingHarnessModuleAPI {
  /** Create a test context with mock event bus and disposables */
  createTestContext(): PluginTestContext;
  /** Register a test suite */
  registerSuite(suite: TestSuiteRegistration): void;
  /** Run a registered test suite by ID */
  runSuite(suiteId: string): Promise<SuiteResult>;
  /** Run all registered suites */
  runAll(): Promise<SuiteResult[]>;
  /** Get registered suites */
  getSuites(): TestSuiteRegistration[];
  /** Create a disposable spy */
  createSpy<T extends (...args: unknown[]) => unknown>(fn?: T): T & { calls: unknown[][]; callCount: number; reset(): void };
  /** Assert helper */
  assert(condition: boolean, message?: string): void;
  /** Create a stub IDisposable for testing */
  createDisposable(): IDisposable & { disposed: boolean };
}
