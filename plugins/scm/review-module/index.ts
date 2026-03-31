// ── Review Module ──────────────────────────────────────────
// Code review integration with GitHub/GitLab.

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { ReviewConfig, ReviewModuleAPI, ReviewComment } from "./types";
import { GitHubClient } from "./github-client";
import { GitLabClient } from "./gitlab-client";

export function createReviewPlugin(
  config: ReviewConfig,
): { plugin: MonacoPlugin; api: ReviewModuleAPI } {
  const ghClient = config.provider === "github"
    ? new GitHubClient(config.apiUrl ?? "https://api.github.com", config.token)
    : null;
  const glClient = config.provider === "gitlab"
    ? new GitLabClient(config.apiUrl ?? "https://gitlab.com/api/v4", config.token)
    : null;
  let ctx: PluginContext | null = null;

  const api: ReviewModuleAPI = {
    async getPullRequests() {
      if (ghClient) return ghClient.getPullRequests("owner", "repo");
      if (glClient) return glClient.getMergeRequests("project-id");
      return [];
    },

    async getComments(prId) {
      if (ghClient) return ghClient.getComments("owner", "repo", prId);
      if (glClient) return glClient.getNotes("project-id", prId);
      return [];
    },

    async addComment(prId, comment) {
      void prId;
      const result: ReviewComment = {
        ...comment,
        id: `comment-${Date.now()}`,
        author: "current-user",
        createdAt: Date.now(),
      };
      ctx?.emit("review:comment-added", result);
      return result;
    },

    async approve(prId) {
      ctx?.emit("review:approved", { prId });
    },

    async requestChanges(prId, message) {
      ctx?.emit("review:changes-requested", { prId, message });
    },
  };

  const plugin: MonacoPlugin = {
    id: "review-module",
    name: "Review Module",
    version: "1.0.0",
    description: "Code review integration (GitHub/GitLab)",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;
    },
    onDispose(): void { ctx = null; },
  };

  return { plugin, api };
}

export type { PullRequest, ReviewComment, ReviewConfig, ReviewModuleAPI } from "./types";
export { GitHubClient } from "./github-client";
export { GitLabClient } from "./gitlab-client";
export { buildReviewDecorations } from "./decorations";
