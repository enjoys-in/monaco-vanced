// ── Review Module Types ────────────────────────────────────

export interface PullRequest {
  readonly id: number;
  readonly title: string;
  readonly author: string;
  readonly state: "open" | "closed" | "merged";
  readonly branch: string;
  readonly baseBranch: string;
  readonly url: string;
  readonly createdAt: number;
}

export interface ReviewComment {
  readonly id: string;
  readonly path: string;
  readonly line: number;
  readonly body: string;
  readonly author: string;
  readonly createdAt: number;
}

export interface ReviewConfig {
  readonly provider: "github" | "gitlab";
  readonly apiUrl?: string;
  readonly token?: string;
}

export interface ReviewModuleAPI {
  getPullRequests(): Promise<PullRequest[]>;
  getComments(prId: number): Promise<ReviewComment[]>;
  addComment(prId: number, comment: Omit<ReviewComment, "id" | "author" | "createdAt">): Promise<ReviewComment>;
  approve(prId: number): Promise<void>;
  requestChanges(prId: number, message: string): Promise<void>;
}
