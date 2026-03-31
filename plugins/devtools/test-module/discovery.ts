// ── Test Module — Discovery ──────────────────────────────────
// Discovers test files and extracts test items via regex patterns.

import type { TestSuite, TestItem, TestFramework } from "./types";

interface TestPattern {
  /** File glob regex */
  filePattern: RegExp;
  /** Regex to extract test names from file content */
  testPattern: RegExp;
}

const PATTERNS: Record<TestFramework, TestPattern> = {
  jest: {
    filePattern: /\.(test|spec)\.(ts|tsx|js|jsx)$/,
    testPattern: /(?:it|test)\s*\(\s*['"`](.+?)['"`]/g,
  },
  vitest: {
    filePattern: /\.(test|spec)\.(ts|tsx|js|jsx)$/,
    testPattern: /(?:it|test)\s*\(\s*['"`](.+?)['"`]/g,
  },
  pytest: {
    filePattern: /(?:test_.*|.*_test)\.py$/,
    testPattern: /def\s+(test_\w+)\s*\(/g,
  },
};

export class TestDiscovery {
  private framework: TestFramework;

  constructor(framework: TestFramework = "vitest") {
    this.framework = framework;
  }

  /**
   * Discover test suites from a list of file entries.
   * In a real implementation this would walk the filesystem;
   * here we accept pre-resolved file list + content getter.
   */
  async discoverTests(
    files: Array<{ path: string; content: string }>,
  ): Promise<TestSuite[]> {
    const pattern = PATTERNS[this.framework];
    const suites: TestSuite[] = [];
    let suiteCounter = 0;
    let testCounter = 0;

    for (const file of files) {
      if (!pattern.filePattern.test(file.path)) continue;

      const tests: TestItem[] = [];
      pattern.testPattern.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = pattern.testPattern.exec(file.content)) !== null) {
        // Approximate line number from character offset
        const line = file.content.substring(0, match.index).split("\n").length;

        tests.push({
          id: `test-${++testCounter}`,
          label: match[1],
          file: file.path,
          line,
          state: "pending",
        });
      }

      if (tests.length > 0) {
        suites.push({
          id: `suite-${++suiteCounter}`,
          label: file.path.split("/").pop() ?? file.path,
          tests,
          file: file.path,
        });
      }
    }

    return suites;
  }

  /** Check whether a filename matches test file patterns */
  isTestFile(filename: string): boolean {
    return PATTERNS[this.framework].filePattern.test(filename);
  }
}
