// ── Theme Module — Plugin Entry ──────────────────────────────
// Loads themes from CDN, caches in IndexedDB via Dexie.
// Supports refresh to re-fetch the index from CDN.

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { ThemeConfig, ThemeDefinition, ThemeModuleAPI, ThemeIndexEntry } from "./types";
import { ThemeRegistry } from "./registry";
import { convertVSCodeTheme } from "./converter";
import {
  getCachedIndex,
  setCachedIndex,
  getCachedTheme,
  setCachedTheme,
} from "./theme-store";

export type { ThemeConfig, ThemeDefinition, ThemeModuleAPI, ThemeTokenColor, ThemeIndexEntry, CachedTheme } from "./types";
export { ThemeRegistry } from "./registry";
export { convertVSCodeTheme } from "./converter";
export { getCachedIndex, setCachedIndex, getCachedTheme, setCachedTheme, clearThemeCache } from "./theme-store";

const DEFAULT_CDN_BASE =
  "https://cdn.jsdelivr.net/npm/@enjoys/context-engine@latest/data/themes";

export function createThemePlugin(config: ThemeConfig = {}): {
  plugin: MonacoPlugin;
  api: ThemeModuleAPI;
} {
  const cdnBase = (config.cdnBase ?? DEFAULT_CDN_BASE).replace(/\/+$/, "");
  const registry = new ThemeRegistry();
  let currentTheme = config.defaultTheme ?? "dracula";
  let ctx: PluginContext | null = null;
  let themeIndex: ThemeIndexEntry[] = [];
  const changeHandlers: Array<(themeId: string) => void> = [];

  // ── Internal helpers ─────────────────────────────────────

  function applyToMonaco(themeId: string, theme: ThemeDefinition): void {
    if (!ctx) return;
    const monacoTheme = convertVSCodeTheme(theme);
    ctx.monaco.editor.defineTheme(
      themeId,
      monacoTheme as Parameters<typeof ctx.monaco.editor.defineTheme>[1],
    );
    ctx.monaco.editor.setTheme(themeId);
  }

  function persistSelection(themeId: string): void {
    if (!config.persistKey) return;
    try {
      localStorage.setItem(config.persistKey, themeId);
    } catch {
      // localStorage may not be available
    }
  }

  function notifyChange(themeId: string): void {
    for (const handler of changeHandlers) {
      try {
        handler(themeId);
      } catch (err) {
        console.warn("[theme-module] change handler error:", err);
      }
    }
    ctx?.emit("theme:changed", { themeId });
  }

  /** Fetch the _index.json from CDN and cache it */
  async function fetchIndex(): Promise<ThemeIndexEntry[]> {
    const url = `${cdnBase}/_index.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch theme index: ${res.status}`);
    const data = (await res.json()) as Record<string, string>;
    const entries: ThemeIndexEntry[] = Object.entries(data).map(([id, file]) => ({ id, file }));
    await setCachedIndex(entries);
    return entries;
  }

  /** Load index from cache first, else fetch from CDN */
  async function loadIndex(): Promise<ThemeIndexEntry[]> {
    const cached = await getCachedIndex();
    if (cached && cached.length > 0) return cached;
    return fetchIndex();
  }

  /** Fetch a single theme JSON from CDN, cache it, and register */
  async function fetchAndCacheTheme(themeId: string): Promise<ThemeDefinition> {
    // Check IndexedDB cache first
    const cached = await getCachedTheme(themeId);
    if (cached) {
      if (!registry.has(themeId)) registry.register(cached);
      return cached;
    }

    // Find filename from index
    const entry = themeIndex.find((e) => e.id === themeId);
    const filename = entry?.file ?? `${themeId}.json`;
    const url = `${cdnBase}/${filename}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch theme "${themeId}": ${res.status}`);
    const raw = (await res.json()) as Record<string, unknown>;

    const theme: ThemeDefinition = {
      id: themeId,
      name: (raw.name as string) ?? themeId,
      type: (raw.type as ThemeDefinition["type"]) ?? "dark",
      colors: (raw.colors as Record<string, string>) ?? {},
      tokenColors: (raw.tokenColors as ThemeDefinition["tokenColors"]) ?? [],
    };

    // Cache in IndexedDB
    await setCachedTheme(themeId, theme);

    // Register in-memory
    registry.register(theme);
    ctx?.emit("theme:registered", { id: theme.id });
    return theme;
  }

  // ── Public API ───────────────────────────────────────────

  const api: ThemeModuleAPI = {
    async apply(themeId: string): Promise<void> {
      let theme = registry.get(themeId);
      if (!theme) {
        // Try loading from CDN
        theme = await fetchAndCacheTheme(themeId);
      }
      applyToMonaco(themeId, theme);
      currentTheme = themeId;
      persistSelection(themeId);
      notifyChange(themeId);
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

    getIndex() {
      return [...themeIndex];
    },

    async loadRemoteTheme(themeId: string): Promise<ThemeDefinition> {
      return fetchAndCacheTheme(themeId);
    },

    async refreshIndex(): Promise<ThemeIndexEntry[]> {
      themeIndex = await fetchIndex();
      ctx?.emit("theme:index-refreshed", { count: themeIndex.length });
      return [...themeIndex];
    },

    onThemeChange(handler: (themeId: string) => void) {
      changeHandlers.push(handler);
    },
  };

  // ── Plugin lifecycle ─────────────────────────────────────

  const plugin: MonacoPlugin = {
    id: "theme-module",
    name: "Theme Module",
    version: "2.0.0",
    description: "Theme management with CDN loading, IndexedDB caching via Dexie, and refresh support",

    async onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      // Load theme index (from cache or CDN)
      try {
        themeIndex = await loadIndex();
      } catch (err) {
        console.warn("[theme-module] failed to load index:", err);
        themeIndex = [];
      }

      // Restore persisted theme or apply default
      let themeToApply = currentTheme;
      if (config.persistKey) {
        try {
          const saved = localStorage.getItem(config.persistKey);
          if (saved) themeToApply = saved;
        } catch {
          // Ignore
        }
      }

      // Apply the initial theme (will fetch from CDN if not cached)
      try {
        await api.apply(themeToApply);
      } catch (err) {
        console.warn(`[theme-module] failed to apply "${themeToApply}":`, err);
      }

      // Listen for theme change events from other modules
      ctx.on("theme:change", async (data?: unknown) => {
        const payload = data as { themeId?: string } | undefined;
        if (payload?.themeId) {
          try {
            await api.apply(payload.themeId);
          } catch (err) {
            console.warn(`[theme-module] failed to apply "${payload.themeId}":`, err);
          }
        }
      });

      // Listen for refresh requests (e.g., from a refresh button)
      ctx.on("theme:refresh", async () => {
        try {
          await api.refreshIndex();
          ctx?.notify("Theme index refreshed", "info");
        } catch (err) {
          ctx?.notify("Failed to refresh themes", "error");
          console.warn("[theme-module] refresh error:", err);
        }
      });

      ctx.emit("theme:ready", {
        themes: registry.getAll().map((t) => t.id),
        indexCount: themeIndex.length,
      });
    },

    onDispose() {
      changeHandlers.length = 0;
      ctx = null;
    },
  };

  return { plugin, api };
}
