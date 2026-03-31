// ── Icon Module — Plugin Entry ───────────────────────────────

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { IconConfig, IconTheme, IconModuleAPI } from "./types";
import { DefaultIconMap } from "./icon-map";
import { SVGCache } from "./svg-cache";

export type { IconConfig, IconMapping, IconTheme, IconModuleAPI } from "./types";
export { DefaultIconMap } from "./icon-map";
export { SVGCache } from "./svg-cache";

export function createIconPlugin(config: IconConfig = {}): {
  plugin: MonacoPlugin;
  api: IconModuleAPI;
} {
  const __svgCache = new SVGCache(config.cacheEnabled ?? true); void __svgCache;
  const themes = new Map<string, IconTheme>();
  let activeThemeId: string | null = null;
  let ctx: PluginContext | null = null;

  function getActiveTheme(): IconTheme | undefined {
    return activeThemeId ? themes.get(activeThemeId) : undefined;
  }

  const api: IconModuleAPI = {
    getIcon(filename: string) {
      const theme = getActiveTheme();
      if (theme) {
        // Check theme definitions first
        const ext = filename.includes(".") ? `.${filename.split(".").pop()!.toLowerCase()}` : "";
        const fromTheme = theme.definitions.get(ext) ?? theme.definitions.get(filename);
        if (fromTheme) return fromTheme;
      }
      // Fall back to default map
      return DefaultIconMap.getIconName(filename);
    },

    registerTheme(theme: IconTheme) {
      themes.set(theme.id, theme);
      ctx?.emit("icon:theme:registered", { id: theme.id });
    },

    getThemes() {
      return Array.from(themes.values());
    },

    setTheme(id: string) {
      if (!themes.has(id)) {
        console.warn(`[icon-module] icon theme "${id}" not found`);
        return;
      }
      activeThemeId = id;
      ctx?.emit("icon:theme:changed", { id });
    },
  };

  const plugin: MonacoPlugin = {
    id: "icon-module",
    name: "Icon Module",
    version: "1.0.0",
    description: "File icon themes with caching support",

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      // Listen for icon theme change events
      ctx.on("icon:change", (data?: unknown) => {
        const payload = data as { themeId?: string } | undefined;
        if (payload?.themeId) {
          api.setTheme(payload.themeId);
        }
      });

      ctx.emit("icon:ready", {});
    },

    onDispose() {
      themes.clear();
      activeThemeId = null;
      ctx = null;
    },
  };

  return { plugin, api };
}
