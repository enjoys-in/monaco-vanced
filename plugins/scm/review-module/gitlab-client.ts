// ── GitLab Client ──────────────────────────────────────────

import type { PullRequest, ReviewComment } from "./types";

export class GitLabClient {
  constructor(
    private apiUrl: string,
    private token?: string,
  ) {}

  private get headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.token) h["PRIVATE-TOKEN"] = this.token;
    return h;
  }

  async getMergeRequests(projectId: string): Promise<PullRequest[]> {
    const res = await fetch(`${this.apiUrl}/projects/${projectId}/merge_requests?state=opened`, { headers: this.headers });
    if (!res.ok) throw new Error(`GitLab API error: ${res.status}`);
    const data = (await res.json()) as Array<Record<string, unknown>>;
    return data.map((mr) => ({
      id: mr.iid as number,
      title: mr.title as string,
      author: (mr.author as Record<string, unknown>)?.username as string ?? "",
      state: mr.state === "merged" ? "merged" : mr.state === "closed" ? "closed" : "open",
      branch: mr.source_branch as string ?? "",
      baseBranch: mr.target_branch as string ?? "",
      url: mr.web_url as string,
      createdAt: new Date(mr.created_at as string).getTime(),
    }));
  }

  async getNotes(projectId: string, mrId: number): Promise<ReviewComment[]> {
    const res = await fetch(`${this.apiUrl}/projects/${projectId}/merge_requests/${mrId}/notes`, { headers: this.headers });
    if (!res.ok) throw new Error(`GitLab API error: ${res.status}`);
    const data = (await res.json()) as Array<Record<string, unknown>>;
    return data.map((n) => ({
      id: String(n.id),
      path: ((n.position as Record<string, unknown>)?.new_path as string) ?? "",
      line: ((n.position as Record<string, unknown>)?.new_line as number) ?? 0,
      body: n.body as string,
      author: (n.author as Record<string, unknown>)?.username as string ?? "",
      createdAt: new Date(n.created_at as string).getTime(),
    }));
  }
}
