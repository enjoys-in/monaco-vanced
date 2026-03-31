// ── Test Module — Runner ─────────────────────────────────────
// Executes test items and reports results.

import type { TestItem, TestSuite, TestConfig } from "./types";

export class TestRunner {
  private abortController: AbortController | null = null;
  private config: TestConfig;

  constructor(config: TestConfig = {}) {
    this.config = config;
  }

  /**
   * Run all tests in the given suites, optionally filtering by test IDs.
   * Emits progress callbacks for each test.
   */
  async run(
    suites: TestSuite[],
    filter?: string[],
    onTestUpdate?: (test: TestItem) => void,
  ): Promise<TestItem[]> {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    const results: TestItem[] = [];
    const timeout = this.config.timeout ?? 30_000;

    for (const suite of suites) {
      for (const test of suite.tests) {
        if (signal.aborted) {
          test.state = "skipped";
          results.push(test);
          continue;
        }

        if (filter && !filter.includes(test.id)) {
          results.push(test);
          continue;
        }

        test.state = "running";
        onTestUpdate?.(test);

        const start = performance.now();

        try {
          // Simulate test execution — in production this would invoke the
          // framework runner via worker / child process
          await Promise.race([
            this.executeTest(test, signal),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Test timeout: ${timeout}ms`)), timeout),
            ),
          ]);

          test.state = "passed";
          test.duration = performance.now() - start;
        } catch (e) {
          test.state = signal.aborted ? "skipped" : "failed";
          test.error = e instanceof Error ? e.message : String(e);
          test.duration = performance.now() - start;
        }

        onTestUpdate?.(test);
        results.push(test);
      }
    }

    this.abortController = null;
    return results;
  }

  cancel(): void {
    this.abortController?.abort();
  }

  private async executeTest(_test: TestItem, signal: AbortSignal): Promise<void> {
    // Placeholder — real implementation would dispatch to framework runner
    if (signal.aborted) throw new Error("Cancelled");
    // The actual test execution would happen here via framework-specific runner
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}
