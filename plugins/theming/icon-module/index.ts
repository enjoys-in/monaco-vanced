// ── Icon Module — Plugin Entry ───────────────────────────────
// File/folder icons via vscode-icons-js.
// VS Code UI icons via @vscode/codicons (CSS class + SVG URL).

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { IconConfig, IconTheme, IconModuleAPI } from "./types";
import { IconEvents } from "@core/events";
import { VSCodeIconResolver, CodiconResolver } from "./icon-map";
import { SVGCache } from "./svg-cache";

export type { IconConfig, IconMapping, IconTheme, IconModuleAPI } from "./types";
export { VSCodeIconResolver, CodiconResolver } from "./icon-map";
export { SVGCache } from "./svg-cache";

export function createIconPlugin(config: IconConfig = {}): {
  plugin: MonacoPlugin;
  api: IconModuleAPI;
} {
  const svgCache = new SVGCache(config.cacheEnabled ?? true);
  const vsIcons = new VSCodeIconResolver(config.vsIconsCdn);
  const codicons = new CodiconResolver(config.codiconsCdn);
  const themes = new Map<string, IconTheme>();
  let activeThemeId: string | null = null;
  let ctx: PluginContext | null = null;

  function getActiveTheme(): IconTheme | undefined {
    return activeThemeId ? themes.get(activeThemeId) : undefined;
  }

  const api: IconModuleAPI = {
    getFileIcon(filename: string, isDirectory = false, isOpen = false): string {
      const theme = getActiveTheme();
      if (theme) {
        const baseName = filename.split("/").pop() ?? filename;
        const ext = baseName.includes(".") ? `.${baseName.split(".").pop()!.toLowerCase()}` : "";
        const fromTheme = theme.definitions.get(ext) ?? theme.definitions.get(baseName);
        if (fromTheme) return fromTheme;
        if (isDirectory && theme.folderMappings) {
          const fromFolder = theme.folderMappings.get(baseName);
          if (fromFolder) return fromFolder;
        }
      }
      // Primary: use vscode-icons-js resolver
      const url = vsIcons.resolve(filename, isDirectory, isOpen);
      // Trigger background caching
      void svgCache.get(url).then((cached) => {
        if (!cached) {
          void fetch(url)
            .then((r) => r.text())
            .then((svg) => svgCache.set(url, svg))
            .catch(() => {});
        }
      });
      return url;
    },

    getCodicon(name: string): string {
      return codicons.className(name);
    },

    getCodiconUrl(name: string): string {
      return codicons.svgUrl(name);
    },

    registerTheme(theme: IconTheme) {
      themes.set(theme.id, theme);
      ctx?.emit(IconEvents.ThemeRegistered, { id: theme.id });
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
      ctx?.emit(IconEvents.ThemeChanged, { id });
    },
  };

  const plugin: MonacoPlugin = {
    id: "icon-module",
    name: "Icon Module",
    version: "2.0.0",
    description: "File icons via vscode-icons, UI icons via @vscode/codicons",

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      ctx.on("icon:change", (data?: unknown) => {
        const payload = data as { themeId?: string } | undefined;
        if (payload?.themeId) {
          api.setTheme(payload.themeId);
        }
      });

      // Listen for icon themes loaded from VSIX extension installations
      ctx.on("vsix:icons:loaded", (data?: unknown) => {
        const payload = data as {
          iconThemes?: Array<{ id: string; name: string; definitions: Map<string, string>; folderMappings: Map<string, string> }>;
          extensionId?: string;
        } | undefined;
        if (payload?.iconThemes && Array.isArray(payload.iconThemes)) {
          for (const iconTheme of payload.iconThemes) {
            api.registerTheme({
              id: iconTheme.id,
              name: iconTheme.name,
              definitions: iconTheme.definitions instanceof Map ? iconTheme.definitions : new Map(Object.entries(iconTheme.definitions)),
              folderMappings: iconTheme.folderMappings instanceof Map ? iconTheme.folderMappings : new Map(Object.entries(iconTheme.folderMappings ?? {})),
            });
          }
          // Auto-activate first VSIX icon theme if none active
          if (!activeThemeId && payload.iconThemes.length > 0) {
            api.setTheme(payload.iconThemes[0].id);
          }
        }
      });

      ctx.emit(IconEvents.Ready, {});
    },

    onDispose() {
      themes.clear();
      activeThemeId = null;
      ctx = null;
    },
  };

  return { plugin, api };
}
