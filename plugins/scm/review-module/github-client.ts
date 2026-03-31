// ── GitHub Client ──────────────────────────────────────────

import type { PullRequest, ReviewComment } from "./types";

export class GitHubClient {
  constructor(
    private apiUrl: string,
    private token?: string,
  ) {}

  private get headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.token) h["Authorization"] = `Bearer ${this.token}`;
    return h;
  }

  async getPullRequests(owner: string, repo: string): Promise<PullRequest[]> {
    const res = await fetch(`${this.apiUrl}/repos/${owner}/${repo}/pulls`, { headers: this.headers });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const data = (await res.json()) as Array<Record<string, unknown>>;
    return data.map((pr) => ({
      id: pr.number as number,
      title: pr.title as string,
      author: (pr.user as Record<string, unknown>)?.login as string ?? "",
      state: pr.state as PullRequest["state"],
      branch: (pr.head as Record<string, unknown>)?.ref as string ?? "",
      baseBranch: (pr.base as Record<string, unknown>)?.ref as string ?? "",
      url: pr.html_url as string,
      createdAt: new Date(pr.created_at as string).getTime(),
    }));
  }

  async getComments(owner: string, repo: string, prId: number): Promise<ReviewComment[]> {
    const res = await fetch(`${this.apiUrl}/repos/${owner}/${repo}/pulls/${prId}/comments`, { headers: this.headers });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const data = (await res.json()) as Array<Record<string, unknown>>;
    return data.map((c) => ({
      id: String(c.id),
      path: c.path as string ?? "",
      line: (c.line ?? c.original_line ?? 0) as number,
      body: c.body as string,
      author: (c.user as Record<string, unknown>)?.login as string ?? "",
      createdAt: new Date(c.created_at as string).getTime(),
    }));
  }
}
