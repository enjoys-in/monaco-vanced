// ── Git Module Types ───────────────────────────────────────

export type GitStatus = "untracked" | "modified" | "staged" | "deleted" | "renamed" | "conflicted" | "unmodified";

export interface GitFileStatus {
  readonly path: string;
  readonly status: GitStatus;
  readonly staged: boolean;
}

export interface GitBranch {
  readonly name: string;
  readonly current: boolean;
  readonly remote?: string;
  readonly ahead?: number;
  readonly behind?: number;
}

export interface GitCommit {
  readonly hash: string;
  readonly message: string;
  readonly author: string;
  readonly date: number;
  readonly parents: string[];
}

export interface GitDiffHunk {
  readonly oldStart: number;
  readonly oldLines: number;
  readonly newStart: number;
  readonly newLines: number;
  readonly content: string;
}

export interface GitConflict {
  readonly path: string;
  readonly ours: string;
  readonly theirs: string;
  readonly base?: string;
}

export interface GitConfig {
  readonly apiUrl?: string;
  readonly corsProxy?: string;
}

export interface GitModuleAPI {
  getStatus(): Promise<GitFileStatus[]>;
  stage(paths: string[]): Promise<void>;
  unstage(paths: string[]): Promise<void>;
  commit(message: string): Promise<GitCommit>;
  getBranches(): Promise<GitBranch[]>;
  checkout(branch: string): Promise<void>;
  createBranch(name: string): Promise<void>;
  diff(path?: string): Promise<GitDiffHunk[]>;
  log(limit?: number): Promise<GitCommit[]>;
  getConflicts(): Promise<GitConflict[]>;
  resolveConflict(path: string, resolution: "ours" | "theirs" | "merged", content?: string): Promise<void>;
}
