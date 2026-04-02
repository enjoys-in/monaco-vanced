// ── Testing Harness Events ───────────────────────────────────

export enum TestingHarnessEvents {
  SuiteRegistered = "test-harness:suite-registered",
  SuiteStarted = "test-harness:suite-started",
  SuiteCompleted = "test-harness:suite-completed",
  MockCreated = "test-harness:mock-created",
}
