// ── Test Module — Shared Types ───────────────────────────────

export type TestState = "pending" | "running" | "passed" | "failed" | "skipped";
export type TestFramework = "jest" | "vitest" | "pytest";

export interface TestItem {
  id: string;
  label: string;
  file: string;
  line: number;
  state: TestState;
  duration?: number;
  error?: string;
}

export interface TestSuite {
  id: string;
  label: string;
  tests: TestItem[];
  file: string;
}

export interface CoverageReport {
  file: string;
  lines: { covered: number; total: number };
  branches: { covered: number; total: number };
  functions: { covered: number; total: number };
  stmtPercent: number;
}

export interface TestConfig {
  framework?: TestFramework;
  timeout?: number;
}

export interface TestModuleAPI {
  discover(rootPath: string): Promise<TestSuite[]>;
  run(ids?: string[]): Promise<TestItem[]>;
  runAll(): Promise<TestItem[]>;
  getResults(): TestItem[];
  getCoverage(): CoverageReport[];
  cancel(): void;
}
