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

  // ── Blob URL cache — serves icons from memory after first fetch ──
  const blobUrlCache = new Map<string, string>();
  const pendingFetches = new Set<string>();

  /** Fetch SVG → cache → create blob URL (background, fire-and-forget) */
  function warmBlobUrl(cdnUrl: string): void {
    if (blobUrlCache.has(cdnUrl) || pendingFetches.has(cdnUrl)) return;
    pendingFetches.add(cdnUrl);

    void svgCache.get(cdnUrl).then(async (cached) => {
      let svg = cached;
      if (!svg) {
        try {
          const r = await fetch(cdnUrl);
          if (!r.ok) { pendingFetches.delete(cdnUrl); return; }
          svg = await r.text();
          void svgCache.set(cdnUrl, svg);
        } catch {
          pendingFetches.delete(cdnUrl);
          return;
        }
      }
      const blob = new Blob([svg], { type: "image/svg+xml" });
      blobUrlCache.set(cdnUrl, URL.createObjectURL(blob));
      pendingFetches.delete(cdnUrl);
    });
  }

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
      // Primary: use vscode-icons-js resolver → CDN URL
      const cdnUrl = vsIcons.resolve(filename, isDirectory, isOpen);
      // Return blob URL from cache if available (instant, no network)
      const blobUrl = blobUrlCache.get(cdnUrl);
      if (blobUrl) return blobUrl;
      // First hit: trigger background fetch → blob URL cache
      warmBlobUrl(cdnUrl);
      return cdnUrl;
    },

    getCodicon(name: string): string {
      return codicons.className(name);
    },

    getCodiconUrl(name: string): string {
      const cdnUrl = codicons.svgUrl(name);
      const blobUrl = blobUrlCache.get(cdnUrl);
      if (blobUrl) return blobUrl;
      warmBlobUrl(cdnUrl);
      return cdnUrl;
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

      // Preload common file/folder icon SVGs into blob URL cache
      const commonFiles = [
        "file.ts", "file.tsx", "file.js", "file.jsx", "file.json", "file.css", "file.scss",
        "file.html", "file.md", "file.py", "file.rs", "file.go", "file.yaml", "file.toml",
        "file.svg", "file.png", "file.txt", "file.sh", "file.sql", "file.xml", "file.graphql",
        "package.json", "tsconfig.json", ".gitignore", "README.md", "Dockerfile", ".env",
        "vite.config.ts", "vitest.config.ts", "eslint.config.mjs", "tailwind.config.ts",
      ];
      const commonFolders = ["src", "lib", "node_modules", "dist", "public", "components", "pages", "api", "hooks", "utils", "styles", "tests", "assets"];
      for (const f of commonFiles) warmBlobUrl(vsIcons.resolve(f, false));
      for (const d of commonFolders) {
        warmBlobUrl(vsIcons.resolve(d, true, false));
        warmBlobUrl(vsIcons.resolve(d, true, true));
      }
    },

    onDispose() {
      // Revoke blob URLs to free memory
      for (const url of blobUrlCache.values()) URL.revokeObjectURL(url);
      blobUrlCache.clear();
      pendingFetches.clear();
      themes.clear();
      activeThemeId = null;
      ctx = null;
    },
  };

  return { plugin, api };
}
