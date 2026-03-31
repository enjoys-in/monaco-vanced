// ── Deep Link Module — Plugin Entry ────────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { DeepLinkConfig, DeepLinkModuleAPI, DeepLinkTarget } from "./types";
import { parseDeepLink } from "./parser";
import { DeepLinkNavigator } from "./navigator";
import { generateDeepLink } from "./generator";
import { DeepLinkEvents, CommandEvents } from "@core/events";

export type { DeepLinkConfig, DeepLinkModuleAPI, DeepLinkTarget, DeepLinkTargetType } from "./types";
export { parseDeepLink, validateScheme } from "./parser";
export { DeepLinkNavigator, type InterceptHandler } from "./navigator";
export { generateDeepLink, generateHashLink } from "./generator";

export function createDeepLinkPlugin(config: DeepLinkConfig = {}): {
  plugin: MonacoPlugin;
  api: DeepLinkModuleAPI;
} {
  const scheme = config.scheme ?? "mvanced";
  const navigator = new DeepLinkNavigator();
  const navHandlers: Array<(data?: unknown) => void> = [];
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;
  let hashChangeHandler: (() => void) | null = null;
  let popstateHandler: (() => void) | null = null;

  function notifyNavigate(target: DeepLinkTarget): void {
    for (const handler of navHandlers) {
      try { handler(target); } catch (e) { console.warn("[deep-link] handler error:", e); }
    }
  }

  const api: DeepLinkModuleAPI = {
    create(target: DeepLinkTarget): string {
      return generateDeepLink(target, scheme);
    },

    async navigate(uri: string): Promise<void> {
      const target = parseDeepLink(uri, scheme);
      if (!target) {
        console.warn(`[deep-link] Invalid URI: ${uri}`);
        return;
      }
      notifyNavigate(target);
      ctx?.emit(DeepLinkEvents.Navigate, target);

      // Route based on type
      if (target.type === "command" && target.commandId) {
        ctx?.emit(CommandEvents.Execute, {
          commandId: target.commandId,
          args: target.args ?? [],
        });
      } else {
        await navigator.navigate(target);
      }
    },

    parse(uri: string): DeepLinkTarget | null {
      return parseDeepLink(uri, scheme);
    },

    onNavigate(handler: (data?: unknown) => void): IDisposable {
      navHandlers.push(handler);
      return {
        dispose() {
          const idx = navHandlers.indexOf(handler);
          if (idx >= 0) navHandlers.splice(idx, 1);
        },
      };
    },
  };

  // Wire navigator to emit events through plugin context
  navigator.setNavigationHandler(async (target) => {
    ctx?.emit(DeepLinkEvents.Navigate, target);
  });

  const plugin: MonacoPlugin = {
    id: "infrastructure.deep-link",
    name: "Deep Link Module",
    version: "1.0.0",
    description: "URI-based deep linking to files, panels, and commands",

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      // Listen for hash changes
      hashChangeHandler = () => {
        const hash = window.location.hash;
        if (hash.startsWith("#/")) {
          api.navigate(hash).catch(console.error);
        }
      };
      window.addEventListener("hashchange", hashChangeHandler);

      // Listen for popstate
      popstateHandler = () => {
        const hash = window.location.hash;
        if (hash.startsWith("#/")) {
          api.navigate(hash).catch(console.error);
        }
      };
      window.addEventListener("popstate", popstateHandler);

      // Handle initial hash
      if (window.location.hash.startsWith("#/")) {
        api.navigate(window.location.hash).catch(console.error);
      }

      // Listen for event bus navigation
      disposables.push(
        ctx.on(DeepLinkEvents.Navigate, async (data?: unknown) => {
          if (typeof data === "string") {
            await api.navigate(data);
          } else {
            const target = data as DeepLinkTarget | undefined;
            if (target) await navigator.navigate(target);
          }
        }),
      );
    },

    onDispose() {
      if (hashChangeHandler) {
        window.removeEventListener("hashchange", hashChangeHandler);
        hashChangeHandler = null;
      }
      if (popstateHandler) {
        window.removeEventListener("popstate", popstateHandler);
        popstateHandler = null;
      }
      disposables.forEach((d) => d.dispose());
      disposables.length = 0;
      navigator.dispose();
      navHandlers.length = 0;
      ctx = null;
    },
  };

  return { plugin, api };
}
