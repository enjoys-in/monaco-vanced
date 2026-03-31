// ── Test Module — Coverage ───────────────────────────────────
// Parses and merges code coverage reports.

import type { CoverageReport } from "./types";

export interface RawCoverageData {
  file: string;
  lines: { hit: number[]; miss: number[] };
  branches: { hit: number; miss: number };
  functions: { hit: number; miss: number };
}

export class CoverageCollector {
  private reports: CoverageReport[] = [];

  parse(data: RawCoverageData[]): CoverageReport[] {
    const parsed: CoverageReport[] = data.map((entry) => {
      const totalLines = entry.lines.hit.length + entry.lines.miss.length;
      const coveredLines = entry.lines.hit.length;
      const totalBranches = entry.branches.hit + entry.branches.miss;
      const totalFunctions = entry.functions.hit + entry.functions.miss;

      const stmtPercent =
        totalLines > 0 ? Math.round((coveredLines / totalLines) * 10000) / 100 : 0;

      return {
        file: entry.file,
        lines: { covered: coveredLines, total: totalLines },
        branches: { covered: entry.branches.hit, total: totalBranches },
        functions: { covered: entry.functions.hit, total: totalFunctions },
        stmtPercent,
      };
    });

    this.reports = parsed;
    return parsed;
  }

  merge(reports: CoverageReport[]): CoverageReport {
    let linesC = 0, linesT = 0;
    let branchC = 0, branchT = 0;
    let funcC = 0, funcT = 0;

    for (const r of reports) {
      linesC += r.lines.covered;
      linesT += r.lines.total;
      branchC += r.branches.covered;
      branchT += r.branches.total;
      funcC += r.functions.covered;
      funcT += r.functions.total;
    }

    return {
      file: "(summary)",
      lines: { covered: linesC, total: linesT },
      branches: { covered: branchC, total: branchT },
      functions: { covered: funcC, total: funcT },
      stmtPercent: linesT > 0 ? Math.round((linesC / linesT) * 10000) / 100 : 0,
    };
  }

  getReports(): CoverageReport[] {
    return [...this.reports];
  }

  clear(): void {
    this.reports = [];
  }
}
