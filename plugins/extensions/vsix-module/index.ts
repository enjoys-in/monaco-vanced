// ── VSIX Module — Plugin Entry ───────────────────────────────
// Orchestrates: fetch → extract → parse → load pipeline

import type { MonacoPlugin, PluginContext } from "@core/types";
import { VsixEvents } from "@core/events";
import type {
  VSIXConfig,
  VSIXPackage,
  VSIXModuleAPI,
} from "./types";
import { VSIXFetcher } from "./fetcher";
import { VSIXExtractor } from "./extractor";
import { VSIXRegistry } from "./registry";
import { VSIXCache } from "./cache";
import { loadThemes } from "./loaders/theme-loader";
import { loadGrammars } from "./loaders/grammar-loader";
import { loadIcons } from "./loaders/icon-loader";
import { loadSnippets } from "./loaders/snippet-loader";
import { loadCommands } from "./loaders/command-loader";
import { loadKeybindings } from "./loaders/keybinding-loader";
import { loadLanguages } from "./loaders/language-loader";

// Re-exports
export type {
  VSIXConfig,
  VSIXManifest,
  VSIXPackage,
  VSIXContributes,
  VSIXModuleAPI,
  VSIXThemeContribution,
  VSIXGrammarContribution,
  VSIXIconContribution,
  VSIXSnippetContribution,
  VSIXCommandContribution,
  VSIXKeybindingContribution,
  VSIXLanguageContribution,
  VSIXLoadedTheme,
  VSIXLoadedIconTheme,
} from "./types";
export { VSIXFetcher } from "./fetcher";
export { VSIXExtractor } from "./extractor";
export { VSIXRegistry } from "./registry";
export { VSIXCache } from "./cache";
export { parseVSIXManifest } from "./manifest-parser";
export { convertVSCodeTheme } from "./converters/theme-converter";
export { convertTextmateToMonarch } from "./converters/textmate-to-monarch";
export { convertIconTheme } from "./converters/icon-converter";
export { loadThemes, type ThemeLoadResult } from "./loaders/theme-loader";
export { loadGrammars } from "./loaders/grammar-loader";
export { loadIcons } from "./loaders/icon-loader";
export { loadSnippets } from "./loaders/snippet-loader";
export { loadCommands } from "./loaders/command-loader";
export { loadKeybindings } from "./loaders/keybinding-loader";
export { loadLanguages } from "./loaders/language-loader";

export function createVSIXPlugin(config: VSIXConfig = {}): {
  plugin: MonacoPlugin;
  api: VSIXModuleAPI;
} {
  const cache = new VSIXCache();
  const fetcher = new VSIXFetcher(config.cdnUrl, cache);
  const extractor = new VSIXExtractor();
  const registry = new VSIXRegistry();
  let ctx: PluginContext | null = null;

  const api: VSIXModuleAPI = {
    async fetch(id: string, version?: string) {
      ctx?.emit(VsixEvents.FetchStart, { id, version });
      const buffer = await fetcher.fetch(id, version);
      const pkg = await extractor.extract(buffer);
      ctx?.emit(VsixEvents.FetchComplete, { id, manifest: pkg.manifest });
      return pkg;
    },

    async install(pkg: VSIXPackage) {
      const id = `${pkg.manifest.publisher}.${pkg.manifest.name}`;
      ctx?.emit(VsixEvents.InstallStart, { id });

      if (ctx) {
        const monaco = ctx.monaco;
        // Load all contributions
        const themeResult = loadThemes(pkg, pkg.manifest, monaco);
        loadGrammars(pkg, pkg.manifest, monaco);
        const iconThemes = loadIcons(pkg, pkg.manifest);
        loadSnippets(pkg, pkg.manifest, monaco);
        loadCommands(pkg, pkg.manifest, (cmdId, title) => {
          ctx!.emit(VsixEvents.CommandRegistered, { command: cmdId, title });
        });
        loadKeybindings(pkg, pkg.manifest, (binding) => {
          ctx!.emit(VsixEvents.KeybindingRegistered, { command: binding.command, key: binding.key });
        });
        loadLanguages(pkg, pkg.manifest, monaco);

        // Emit theme data for theme-module to consume
        if (themeResult.themes.length > 0) {
          ctx.emit(VsixEvents.ThemesLoaded, { themes: themeResult.themes, extensionId: id });
        }

        // Emit icon theme data for icon-module to consume
        if (iconThemes.length > 0) {
          ctx.emit(VsixEvents.IconsLoaded, { iconThemes, extensionId: id });
        }
      }

      registry.register(pkg.manifest);
      ctx?.emit(VsixEvents.InstallComplete, { id });
    },

    getInstalled() {
      return registry.getAll();
    },

    uninstall(id: string) {
      registry.unregister(id);
      ctx?.emit(VsixEvents.Uninstalled, { id });
    },

    async clearCache() {
      await cache.clear();
      ctx?.emit(VsixEvents.CacheCleared, {});
    },
  };

  const plugin: MonacoPlugin = {
    id: "vsix-module",
    name: "VSIX Module",
    version: "1.0.0",
    description: "Load VS Code extensions (.vsix) in Monaco — themes, grammars, snippets, and more",

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;
      ctx.emit(VsixEvents.Ready, {});
    },

    onDispose() {
      registry.clear();
      ctx = null;
    },
  };

  return { plugin, api };
}
