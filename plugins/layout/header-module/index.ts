// ── Header Module ──────────────────────────────────────────
// Anti-gravity header bar: menus, profile, AI status,
// notification badge. Independent of editor content.

import type { MonacoPlugin, PluginContext } from "@core/types";
import { HeaderEvents } from "@core/events";
import { AuthEvents } from "@core/events";
import { AiEvents } from "@core/events";
import type {
  HeaderConfig,
  HeaderModuleAPI,
  HeaderState,
  MenuEntry,
  UserProfile,
} from "./types";
import { MenuBar } from "./menu-bar";
import { ProfileState } from "./profile";
import { WindowControls } from "./window-controls";

export function createHeaderPlugin(
  config: HeaderConfig = {},
): { plugin: MonacoPlugin; api: HeaderModuleAPI } {
  const menuBar = new MenuBar();
  const profileState = new ProfileState();
  const windowControls = new WindowControls();

  let title = config.title ?? "Monaco Vanced";
  let aiStatus: "idle" | "thinking" | "error" = "idle";
  let notificationCount = 0;
  let ctx: PluginContext | null = null;

  if (config.menus) {
    menuBar.setMenus(config.menus);
  }

  const api: HeaderModuleAPI = {
    getState(): HeaderState {
      return {
        title,
        profile: profileState.get(),
        aiStatus,
        notificationCount,
        menus: menuBar.getMenus(),
      };
    },

    setTitle(newTitle: string): void {
      title = newTitle;
      ctx?.emit(HeaderEvents.TitleChange, { title });
    },

    setMenus(menus: MenuEntry[]): void {
      menuBar.setMenus(menus);
    },

    updateProfile(profile: UserProfile | null): void {
      profileState.update(profile);
    },

    setAIStatus(status: "idle" | "thinking" | "error"): void {
      aiStatus = status;
    },

    setNotificationCount(count: number): void {
      notificationCount = Math.max(0, count);
    },
  };

  const plugin: MonacoPlugin = {
    id: "header-module",
    name: "Header Module",
    version: "1.0.0",
    description: "Anti-gravity header bar with menus, profile, and status indicators",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;

      // Listen for auth events
      ctx.addDisposable(
        ctx.on(AuthEvents.LoginSuccess, (data) => {
          const { user } = data as { user: UserProfile };
          profileState.update(user);
        }),
      );

      ctx.addDisposable(
        ctx.on(AuthEvents.Logout, () => {
          profileState.update(null);
        }),
      );

      // Listen for AI status
      ctx.addDisposable(
        ctx.on(AiEvents.Status, (data) => {
          const { state } = data as { state: "idle" | "thinking" | "error" };
          aiStatus = state;
        }),
      );

      // Listen for notification badge
      ctx.addDisposable(
        ctx.on("notification:badge", (data) => {
          const { count } = data as { count: number };
          notificationCount = count;
        }),
      );

      // Emit sidebar toggle on request
      ctx.addDisposable(
        ctx.on(HeaderEvents.SidebarToggle, () => {
          ctx?.emit("sidebar:toggle", {});
        }),
      );

      // Menu open event
      ctx.addDisposable(
        ctx.on(HeaderEvents.MenuOpen, (data) => {
          const { menu } = data as { menu: string };
          const entry = menuBar.getMenu(menu);
          if (entry) {
            ctx?.emit(HeaderEvents.MenuToggle, { menuId: menu, items: entry.children });
          }
        }),
      );
    },

    onDispose(): void {
      menuBar.dispose();
      profileState.dispose();
      windowControls.dispose();
      ctx = null;
    },
  };

  return { plugin, api };
}

// ── Re-exports ─────────────────────────────────────────────

export type {
  HeaderConfig,
  HeaderModuleAPI,
  HeaderState,
  MenuEntry,
  UserProfile,
  HeaderSection,
} from "./types";

export { MenuBar } from "./menu-bar";
export { ProfileState } from "./profile";
export { WindowControls, type WindowAction, type WindowControlsState } from "./window-controls";
