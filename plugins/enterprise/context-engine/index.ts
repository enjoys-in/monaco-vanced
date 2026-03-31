// ── Context Engine Module ──────────────────────────────────

import type { MonacoPlugin, PluginContext } from "@core/types";
import { ContextStorage } from "./storage";
import { ProviderRegistry } from "./providers";
import { ContextEngineAPI } from "./api";
import { convertManifestToProviders, convertTheme, convertGrammar } from "./converters";

// Re-export interfaces
export * from "./interfaces";

// Re-export internals
export { ContextStorage, ProviderRegistry, ContextEngineAPI };
export { convertManifestToProviders, convertTheme, convertGrammar };

export interface ContextEngineConfig {
  preloadManifest?: boolean;
}

export interface ContextEngineModuleAPI {
  getProviderData(language: string, provider: string): unknown | undefined;
  registerLanguage(id: string, name: string, files?: Record<string, string>): void;
  getManifest(): import("./interfaces/manifest").ContextEngineManifest | null;
  registerProviderData(language: string, providerName: string, data: unknown): void;
  getRegisteredLanguages(): string[];
}

export function createContextEnginePlugin(
  _config: ContextEngineConfig = {},
): { plugin: MonacoPlugin; api: ContextEngineModuleAPI } {
  const storage = new ContextStorage();
  const providers = new ProviderRegistry();
  const engine = new ContextEngineAPI(storage, providers);

  let ctx: PluginContext | null = null;

  const api: ContextEngineModuleAPI = {
    getProviderData(language: string, provider: string): unknown | undefined {
      return engine.getProviderData(language, provider);
    },

    registerLanguage(id: string, name: string, files?: Record<string, string>): void {
      engine.registerLanguage({
        id,
        name,
        files: (files ?? {}) as import("./interfaces/manifest").LanguageFileMap,
      });
      ctx?.emit("context:language-registered", { id, name });
    },

    getManifest() {
      return engine.getManifest();
    },

    registerProviderData(language: string, providerName: string, data: unknown): void {
      engine.registerProviderData(language, providerName, data);
      ctx?.emit("context:provider-loaded", { language, provider: providerName });
    },

    getRegisteredLanguages(): string[] {
      return engine.getRegisteredLanguages();
    },
  };

  const plugin: MonacoPlugin = {
    id: "context-engine",
    name: "Context Engine",
    version: "1.0.0",
    description: "Language context management with provider registry and manifest support",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;
    },

    onDispose(): void {
      engine.clearAll();
      ctx = null;
    },
  };

  return { plugin, api };
}
