// ── Theme Module — Plugin Entry ──────────────────────────────

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { ThemeConfig, ThemeDefinition, ThemeModuleAPI } from "./types";
import { ThemeRegistry } from "./registry";
import { convertVSCodeTheme } from "./converter";

// Built-in themes
import draculaTheme from "./builtin/dracula.json";
import githubDarkTheme from "./builtin/github-dark.json";
import githubLightTheme from "./builtin/github-light.json";
import monokaiTheme from "./builtin/monokai.json";
import oneDarkTheme from "./builtin/one-dark.json";

export type { ThemeConfig, ThemeDefinition, ThemeModuleAPI, ThemeTokenColor } from "./types";
export { ThemeRegistry } from "./registry";
export { convertVSCodeTheme } from "./converter";

const BUILTIN_THEMES: Array<{ id: string; data: Record<string, unknown> }> = [
  { id: "dracula", data: draculaTheme as unknown as Record<string, unknown> },
  { id: "github-dark", data: githubDarkTheme as unknown as Record<string, unknown> },
  { id: "github-light", data: githubLightTheme as unknown as Record<string, unknown> },
  { id: "monokai", data: monokaiTheme as unknown as Record<string, unknown> },
  { id: "one-dark", data: oneDarkTheme as unknown as Record<string, unknown> },
];

export function createThemePlugin(config: ThemeConfig = {}): {
  plugin: MonacoPlugin;
  api: ThemeModuleAPI;
} {
  const registry = new ThemeRegistry();
  let currentTheme = config.defaultTheme ?? "dracula";
  let ctx: PluginContext | null = null;
  const changeHandlers: Array<(themeId: string) => void> = [];

  function applyTheme(themeId: string): void {
    const theme = registry.get(themeId);
    if (!theme) {
      console.warn(`[theme-module] theme "${themeId}" not found`);
      return;
    }

    if (ctx) {
      const monacoTheme = convertVSCodeTheme(theme);
      ctx.monaco.editor.defineTheme(themeId, monacoTheme as Parameters<typeof ctx.monaco.editor.defineTheme>[1]);
      ctx.monaco.editor.setTheme(themeId);
    }

    currentTheme = themeId;

    // Persist selection
    if (config.persistKey) {
      try {
        localStorage.setItem(config.persistKey, themeId);
      } catch {
        // localStorage may not be available
      }
    }

    // Notify handlers
    for (const handler of changeHandlers) {
      try {
        handler(themeId);
      } catch (err) {
        console.warn("[theme-module] change handler error:", err);
      }
    }

    ctx?.emit("theme:changed", { themeId });
  }

  const api: ThemeModuleAPI = {
    apply(themeId: string) {
      applyTheme(themeId);
    },

    register(theme: ThemeDefinition) {
      registry.register(theme);
      ctx?.emit("theme:registered", { id: theme.id });
    },

    getThemes() {
      return registry.getAll();
    },

    getCurrent() {
      return currentTheme;
    },

    onThemeChange(handler: (themeId: string) => void) {
      changeHandlers.push(handler);
    },
  };

  const plugin: MonacoPlugin = {
    id: "theme-module",
    name: "Theme Module",
    version: "1.0.0",
    description: "Theme management with built-in themes and custom theme support",

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      // Register built-in themes
      for (const { id, data } of BUILTIN_THEMES) {
        const theme: ThemeDefinition = {
          id,
          name: (data.name as string) ?? id,
          type: (data.type as ThemeDefinition["type"]) ?? "dark",
          colors: (data.colors as Record<string, string>) ?? {},
          tokenColors: (data.tokenColors as ThemeDefinition["tokenColors"]) ?? [],
        };
        registry.register(theme);
      }

      // Restore persisted theme or apply default
      let themeToApply = currentTheme;
      if (config.persistKey) {
        try {
          const saved = localStorage.getItem(config.persistKey);
          if (saved && registry.has(saved)) {
            themeToApply = saved;
          }
        } catch {
          // Ignore
        }
      }

      applyTheme(themeToApply);

      // Listen for theme change events from other modules
      ctx.on("theme:change", (data?: unknown) => {
        const payload = data as { themeId?: string } | undefined;
        if (payload?.themeId) {
          applyTheme(payload.themeId);
        }
      });

      ctx.emit("theme:ready", { themes: registry.getAll().map((t) => t.id) });
    },

    onDispose() {
      changeHandlers.length = 0;
      ctx = null;
    },
  };

  return { plugin, api };
}
