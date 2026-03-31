// ── Title Module ───────────────────────────────────────────
// Title bar above the editor: file name, dirty state,
// language, encoding, branch. Per editor group.

import type { MonacoPlugin, PluginContext } from "@core/types";
import { TitlebarEvents, TabEvents, EditorEvents } from "@core/events";
import { GitEvents } from "@core/events";
import type { TitleModuleAPI, TitlePluginOptions } from "./types";
import { TitleStateManager } from "./title-state";

export function createTitlePlugin(
  options: TitlePluginOptions = {},
): { plugin: MonacoPlugin; api: TitleModuleAPI } {
  const { defaultEncoding = "UTF-8" } = options;

  const stateManager = new TitleStateManager(defaultEncoding);
  let ctx: PluginContext | null = null;

  const api: TitleModuleAPI = {
    getState: () => stateManager.getState(),
    setFileName: (name) => {
      stateManager.setFileName(name);
      ctx?.emit(TitlebarEvents.Update, stateManager.getState());
    },
    setFilePath: (path) => {
      stateManager.setFilePath(path);
      ctx?.emit(TitlebarEvents.Update, stateManager.getState());
    },
    setDirty: (dirty) => {
      stateManager.setDirty(dirty);
      ctx?.emit(TitlebarEvents.Update, stateManager.getState());
    },
    setLanguage: (language) => {
      stateManager.setLanguage(language);
      ctx?.emit(TitlebarEvents.Update, stateManager.getState());
    },
    setEncoding: (encoding) => {
      stateManager.setEncoding(encoding);
      ctx?.emit(TitlebarEvents.Update, stateManager.getState());
    },
    setBranch: (branch) => {
      stateManager.setBranch(branch);
      ctx?.emit(TitlebarEvents.Update, stateManager.getState());
    },
  };

  const plugin: MonacoPlugin = {
    id: "title-module",
    name: "Title Module",
    version: "1.0.0",
    description: "Title bar with file name, dirty indicator, language, branch",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;

      // Tab switch → update file info
      ctx.addDisposable(
        ctx.on(TabEvents.Switch, (data) => {
          const { uri, label, isDirty } = data as {
            uri: string;
            label: string;
            isDirty?: boolean;
          };
          stateManager.setFilePath(uri);
          stateManager.setFileName(label);
          if (typeof isDirty === "boolean") stateManager.setDirty(isDirty);
          ctx?.emit(TitlebarEvents.Update, stateManager.getState());
        }),
      );

      // Tab dirty → update dirty state
      ctx.addDisposable(
        ctx.on(TabEvents.Dirty, (data) => {
          const { dirty } = data as { uri: string; dirty: boolean };
          stateManager.setDirty(dirty);
          ctx?.emit(TitlebarEvents.Update, stateManager.getState());
        }),
      );

      // Language change
      ctx.addDisposable(
        ctx.on(EditorEvents.LanguageChange, (data) => {
          const { language } = data as { language: string };
          stateManager.setLanguage(language);
          ctx?.emit(TitlebarEvents.Update, stateManager.getState());
        }),
      );

      // Git branch change
      ctx.addDisposable(
        ctx.on(GitEvents.BranchChange, (data) => {
          const { branch } = data as { branch: string };
          stateManager.setBranch(branch);
          ctx?.emit(TitlebarEvents.Update, stateManager.getState());
        }),
      );

      // Breadcrumb click
      ctx.addDisposable(
        ctx.on(TitlebarEvents.ActionClick, (data) => {
          const { action } = data as { action: string; segment?: string };
          if (action === "language-click") {
            ctx?.emit("titlebar:language-click", {});
          } else if (action === "encoding-click") {
            ctx?.emit("titlebar:encoding-click", {});
          }
        }),
      );
    },

    onDispose(): void {
      stateManager.dispose();
      ctx = null;
    },
  };

  return { plugin, api };
}

// ── Re-exports ─────────────────────────────────────────────

export type {
  TitleModuleAPI,
  TitlePluginOptions,
  TitleState,
  BreadcrumbSegment,
} from "./types";

export { TitleStateManager } from "./title-state";
export { buildBreadcrumbs, getDisplayTitle } from "./breadcrumb";
