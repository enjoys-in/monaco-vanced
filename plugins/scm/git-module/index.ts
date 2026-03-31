// ── Git Module ─────────────────────────────────────────────
// Git integration: status, staging, branches, diff, conflicts.

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { GitConfig, GitModuleAPI, GitConflict } from "./types";
import { GitClient } from "./client";
import { StagingArea } from "./staging";
import { BranchManager } from "./branch";
import { detectConflicts, resolveContent } from "./conflict";
import { GitEvents } from "@core/events/git.events";

export function createGitPlugin(
  config: GitConfig = {},
): { plugin: MonacoPlugin; api: GitModuleAPI } {
  const client = new GitClient(config);
  const staging = new StagingArea();
  const branches = new BranchManager();
  let ctx: PluginContext | null = null;

  const api: GitModuleAPI = {
    async getStatus() {
      const statuses = await client.status();
      staging.sync(statuses);
      ctx?.emit(GitEvents.Status, { files: statuses });
      return statuses;
    },

    async stage(paths) {
      await client.stage(paths);
      staging.stage(paths);
      ctx?.emit("git:stage", { paths });
    },

    async unstage(paths) {
      await client.unstage(paths);
      staging.unstage(paths);
      ctx?.emit("git:unstage", { paths });
    },

    async commit(message) {
      const commit = await client.commit(message);
      staging.clear();
      ctx?.emit(GitEvents.Commit, { hash: commit.hash, message });
      return commit;
    },

    async getBranches() {
      const list = await client.branches();
      branches.sync(list);
      return list;
    },

    async checkout(branch) {
      await client.checkout(branch);
      branches.setCurrent(branch);
      ctx?.emit(GitEvents.BranchChange, { branch });
    },

    async createBranch(name) {
      await client.createBranch(name);
      ctx?.emit(GitEvents.BranchChange, { branch: name, created: true });
    },

    async diff(path) {
      return client.diff(path);
    },

    async log(limit) {
      return client.log(limit);
    },

    async getConflicts(): Promise<GitConflict[]> {
      const statuses = await api.getStatus();
      const conflicted = statuses.filter((s) => s.status === "conflicted");
      // In a real impl, we'd read file content via fs-module
      return conflicted.map((s) => ({
        path: s.path,
        ours: "",
        theirs: "",
      }));
    },

    async resolveConflict(path, resolution, content) {
      // Apply resolution — in real impl, read + write via fs-module
      void resolveContent("", resolution, content);
      void detectConflicts(path, "");
      ctx?.emit("git:conflict-resolved", { path, resolution });
    },
  };

  const plugin: MonacoPlugin = {
    id: "git-module",
    name: "Git Module",
    version: "1.0.0",
    description: "Git integration for SCM operations",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;
    },

    onDispose(): void {
      ctx = null;
    },
  };

  return { plugin, api };
}

export type { GitFileStatus, GitBranch, GitCommit, GitDiffHunk, GitConflict, GitConfig, GitModuleAPI } from "./types";
export { GitClient } from "./client";
export { StagingArea } from "./staging";
export { BranchManager } from "./branch";
export { parseDiff } from "./diff";
export { detectConflicts, resolveContent } from "./conflict";
export { getDecorationType, buildGutterDecorations } from "./decorations";
