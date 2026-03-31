// ── Staging ────────────────────────────────────────────────
// In-memory staging area for git operations.

import type { GitFileStatus, GitStatus } from "./types";

export class StagingArea {
  private files = new Map<string, GitFileStatus>();

  setStatus(path: string, status: GitStatus, staged: boolean): void {
    this.files.set(path, { path, status, staged });
  }

  stage(paths: string[]): void {
    for (const p of paths) {
      const f = this.files.get(p);
      if (f) this.files.set(p, { ...f, staged: true });
    }
  }

  unstage(paths: string[]): void {
    for (const p of paths) {
      const f = this.files.get(p);
      if (f) this.files.set(p, { ...f, staged: false });
    }
  }

  getAll(): GitFileStatus[] {
    return Array.from(this.files.values());
  }

  getStaged(): GitFileStatus[] {
    return this.getAll().filter((f) => f.staged);
  }

  getUnstaged(): GitFileStatus[] {
    return this.getAll().filter((f) => !f.staged && f.status !== "unmodified");
  }

  clear(): void {
    this.files.clear();
  }

  sync(statuses: GitFileStatus[]): void {
    this.files.clear();
    for (const s of statuses) this.files.set(s.path, s);
  }
}
