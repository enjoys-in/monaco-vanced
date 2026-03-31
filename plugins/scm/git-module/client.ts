// ── Git Client ─────────────────────────────────────────────
// HTTP-based git operations via proxy API (browser environment).

import type { GitCommit, GitConfig, GitFileStatus, GitBranch, GitDiffHunk } from "./types";

export class GitClient {
  private baseUrl: string;
  private corsProxy?: string;

  constructor(config: GitConfig = {}) {
    this.baseUrl = config.apiUrl ?? "/api/git";
    this.corsProxy = config.corsProxy;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.corsProxy ?? ""}${this.baseUrl}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
    if (!res.ok) throw new Error(`Git API error: ${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
  }

  async status(): Promise<GitFileStatus[]> {
    return this.request<GitFileStatus[]>("/status");
  }

  async stage(paths: string[]): Promise<void> {
    await this.request("/stage", { method: "POST", body: JSON.stringify({ paths }) });
  }

  async unstage(paths: string[]): Promise<void> {
    await this.request("/unstage", { method: "POST", body: JSON.stringify({ paths }) });
  }

  async commit(message: string): Promise<GitCommit> {
    return this.request<GitCommit>("/commit", { method: "POST", body: JSON.stringify({ message }) });
  }

  async branches(): Promise<GitBranch[]> {
    return this.request<GitBranch[]>("/branches");
  }

  async checkout(branch: string): Promise<void> {
    await this.request("/checkout", { method: "POST", body: JSON.stringify({ branch }) });
  }

  async createBranch(name: string): Promise<void> {
    await this.request("/branch", { method: "POST", body: JSON.stringify({ name }) });
  }

  async diff(path?: string): Promise<GitDiffHunk[]> {
    const query = path ? `?path=${encodeURIComponent(path)}` : "";
    return this.request<GitDiffHunk[]>(`/diff${query}`);
  }

  async log(limit = 50): Promise<GitCommit[]> {
    return this.request<GitCommit[]>(`/log?limit=${limit}`);
  }
}
