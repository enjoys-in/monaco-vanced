// ── Navigation Module ──────────────────────────────────────
// Forward/back navigation, symbol breadcrumbs.

import type { MonacoPlugin, PluginContext } from "@core/types";
import { NavigationEvents, TabEvents } from "@core/events";
import type { BreadcrumbSegment, NavigationModuleAPI, NavigationPluginOptions } from "./types";
import { NavigationHistory } from "./history";
import { buildBreadcrumbs } from "./breadcrumb";

export function createNavigationPlugin(
  options: NavigationPluginOptions = {},
): { plugin: MonacoPlugin; api: NavigationModuleAPI } {
  const { maxHistorySize = 100 } = options;

  const history = new NavigationHistory(maxHistorySize);
  let ctx: PluginContext | null = null;

  const api: NavigationModuleAPI = {
    goBack() {
      const entry = history.goBack();
      if (entry) {
        ctx?.emit(NavigationEvents.Back, entry);
      }
      return entry;
    },

    goForward() {
      const entry = history.goForward();
      if (entry) {
        ctx?.emit(NavigationEvents.Forward, entry);
      }
      return entry;
    },

    push(entry) {
      history.push(entry);
    },

    getHistory() {
      return history.getAll();
    },

    canGoBack() {
      return history.canGoBack();
    },

    canGoForward() {
      return history.canGoForward();
    },

    getBreadcrumbs(filePath: string): BreadcrumbSegment[] {
      return buildBreadcrumbs(filePath);
    },

    clearHistory() {
      history.clear();
    },
  };

  const plugin: MonacoPlugin = {
    id: "navigation-module",
    name: "Navigation Module",
    version: "1.0.0",
    description: "Forward/back navigation and symbol breadcrumbs",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;

      // Track tab switches in navigation history
      ctx.addDisposable(
        ctx.on(TabEvents.Switch, (data) => {
          const { uri, label } = data as { uri: string; label?: string };
          history.push({ uri, label });
        }),
      );

      // Go-to-definition → push to history
      ctx.addDisposable(
        ctx.on(NavigationEvents.GoToDefinition, (data) => {
          const { uri, line, column } = data as {
            uri: string;
            line?: number;
            column?: number;
          };
          history.push({ uri, line, column });
        }),
      );

      // Go-to-reference → push to history
      ctx.addDisposable(
        ctx.on(NavigationEvents.GoToReference, (data) => {
          const { uri, line, column } = data as {
            uri: string;
            line?: number;
            column?: number;
          };
          history.push({ uri, line, column });
        }),
      );

      // Go-to-line → push to history
      ctx.addDisposable(
        ctx.on(NavigationEvents.GoToLine, (data) => {
          const { uri, line } = data as { uri: string; line: number };
          history.push({ uri, line });
        }),
      );

      // Breadcrumb click
      ctx.addDisposable(
        ctx.on(NavigationEvents.BreadcrumbClick, (data) => {
          const { path } = data as { path: string };
          history.push({ uri: path });
        }),
      );
    },

    onDispose(): void {
      history.dispose();
      ctx = null;
    },
  };

  return { plugin, api };
}

// ── Re-exports ─────────────────────────────────────────────

export type {
  NavigationModuleAPI,
  NavigationPluginOptions,
  NavigationEntry,
  BreadcrumbSegment,
} from "./types";

export { NavigationHistory } from "./history";
export { buildBreadcrumbs, appendSymbolBreadcrumb } from "./breadcrumb";
