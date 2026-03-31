// ── Marketplace Module — Plugin Entry ────────────────────────

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { MarketplaceConfig, SearchOptions, MarketplaceModuleAPI } from "./types";
import { MarketplaceClient } from "./api-client";
import { SearchEngine } from "./search";
import { ExtensionInstaller } from "./installer";

export type { MarketplaceConfig, MarketplaceEntry, SearchOptions, MarketplaceModuleAPI } from "./types";
export { MarketplaceClient } from "./api-client";
export { SearchEngine } from "./search";
export { ExtensionInstaller } from "./installer";
export type { InstallProgress } from "./installer";

export function createMarketplacePlugin(config: MarketplaceConfig = {}): {
  plugin: MonacoPlugin;
  api: MarketplaceModuleAPI;
} {
  const client = new MarketplaceClient(config.registryUrl);
  const searchEngine = new SearchEngine();
  const installer = new ExtensionInstaller();
  let ctx: PluginContext | null = null;

  const api: MarketplaceModuleAPI = {
    async search(options: SearchOptions) {
      try {
        // Try remote search first
        const results = await client.search(options);
        searchEngine.setEntries(results);
        return results;
      } catch {
        // Fall back to local search
        return searchEngine.search(options);
      }
    },

    async getExtension(id: string) {
      return client.getExtension(id);
    },

    async install(id: string) {
      ctx?.emit("marketplace:install:start", { id });

      installer.onProgress((progress) => {
        ctx?.emit("marketplace:install:progress", { id, ...progress });
      });

      const buffer = await client.download(id);
      const files = await installer.extract(buffer);
      const valid = await installer.validate(files);

      if (!valid) {
        throw new Error(`Extension "${id}" validation failed`);
      }

      await installer.install(id, files);
      ctx?.emit("marketplace:install:complete", { id });
    },

    async getPopular(limit?: number) {
      return client.getPopular(limit);
    },

    async getCategories() {
      return client.getCategories();
    },
  };

  const plugin: MonacoPlugin = {
    id: "marketplace-module",
    name: "Marketplace Module",
    version: "1.0.0",
    description: "Extension marketplace with search and install capabilities",

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;
      ctx.emit("marketplace:ready", {});
    },

    onDispose() {
      ctx = null;
    },
  };

  return { plugin, api };
}
