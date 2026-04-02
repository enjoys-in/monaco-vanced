// ── Context Engine Module ──────────────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import { ContextStorage } from "./storage";
import { ProviderRegistry } from "./providers";
import { ContextEngineAPI } from "./api";
import { convertManifestToProviders, convertTheme, convertGrammar } from "./converters";
import { ContextEngineEvents, LspEvents, EditorEvents, FileEvents } from "@core/events";
import { LazyContextLoader } from "./lazy-loader";
import { registerMonacoProviders } from "./monaco-bridge";

// Re-export interfaces
export * from "./interfaces";

// Re-export internals
export { ContextStorage, ProviderRegistry, ContextEngineAPI };
export { convertManifestToProviders, convertTheme, convertGrammar };
export { LazyContextLoader };

export interface ContextEngineConfig {
  preloadManifest?: boolean;
  /** Enable lazy CDN loading when LSP is not connected for a language */
  lazyLoad?: boolean;
  /** CDN base URL for lazy loading (default: jsdelivr @enjoys/context-engine) */
  cdnBaseUrl?: string;
  /** LSP server base URL — used for /api/health check before CDN fallback */
  lspBaseUrl?: string;
  /** Health check timeout in ms (default: 5 000) */
  healthTimeoutMs?: number;
}

export interface ContextEngineModuleAPI {
  getProviderData(language: string, provider: string): unknown | undefined;
  registerLanguage(id: string, name: string, files?: Record<string, string>): void;
  getManifest(): import("./interfaces/manifest").ContextEngineManifest | null;
  registerProviderData(language: string, providerName: string, data: unknown): void;
  getRegisteredLanguages(): string[];
  /** Manually trigger lazy load for a specific language */
  loadLanguage(languageId: string): Promise<boolean>;
  /** Check if LSP is currently connected for a language */
  isLspConnected(languageId: string): boolean;
}

export function createContextEnginePlugin(
  config: ContextEngineConfig = {},
): { plugin: MonacoPlugin; api: ContextEngineModuleAPI } {
  const storage = new ContextStorage();
  const providers = new ProviderRegistry();
  const engine = new ContextEngineAPI(storage, providers);
  const lazyLoader = new LazyContextLoader(engine, {
    cdnBaseUrl: config.cdnBaseUrl,
    lspBaseUrl: config.lspBaseUrl,
    healthTimeoutMs: config.healthTimeoutMs,
  });

  let ctx: PluginContext | null = null;
  const disposables: IDisposable[] = [];
  const lazyEnabled = config.lazyLoad !== false; // on by default

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
      ctx?.emit(ContextEngineEvents.LanguageRegistered, { id, name });
    },

    getManifest() {
      return engine.getManifest();
    },

    registerProviderData(language: string, providerName: string, data: unknown): void {
      engine.registerProviderData(language, providerName, data);
      ctx?.emit(ContextEngineEvents.ProviderLoaded, { language, provider: providerName });
    },

    getRegisteredLanguages(): string[] {
      return engine.getRegisteredLanguages();
    },

    async loadLanguage(languageId: string): Promise<boolean> {
      return lazyLoader.loadForLanguage(
        languageId,
        () => ctx?.emit(ContextEngineEvents.LazyFetchStarted, { language: languageId }),
        (count) => ctx?.emit(ContextEngineEvents.LazyFetchComplete, { language: languageId, providers: count }),
        (error) => ctx?.emit(ContextEngineEvents.LazyFetchFailed, { language: languageId, error }),
        () => ctx?.emit(ContextEngineEvents.ManifestLoaded, {}),
        () => ctx?.emit(LspEvents.HealthCheckOk, { source: "context-engine" }),
        () => ctx?.emit(LspEvents.HealthCheckFailed, { source: "context-engine" }),
      );
    },

    isLspConnected(languageId: string): boolean {
      return lazyLoader.isLspConnected(languageId);
    },
  };

  const plugin: MonacoPlugin = {
    id: "context-engine",
    name: "Context Engine",
    version: "1.0.0",
    description: "Language context management with provider registry, manifest support, and lazy CDN loading",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;

      if (!lazyEnabled) return;

      // Track LSP connection status per language
      disposables.push(
        ctx.on(LspEvents.Connected, (payload: unknown) => {
          const { languageId } = payload as { languageId?: string };
          if (languageId) lazyLoader.markLspConnected(languageId);
        }),
      );
      disposables.push(
        ctx.on(LspEvents.Disconnected, (payload: unknown) => {
          const { languageId } = payload as { languageId?: string };
          if (languageId) lazyLoader.markLspDisconnected(languageId);
          // Force re-check health on next request
          lazyLoader.invalidateHealth();
        }),
      );

      // Lazy-load on language change (file open / language detection)
      disposables.push(
        ctx.on(EditorEvents.LanguageChange, (payload: unknown) => {
          const { languageId, language } = payload as { languageId?: string; language?: string };
          const lang = languageId ?? language;
          if (lang) {
            api.loadLanguage(lang).then((fetched) => {
              if (fetched && ctx) {
                registerMonacoProviders(ctx.monaco, lang, engine);
              }
            }).catch((err) => {
              console.warn(`[context-engine] Lazy load failed for ${lang}:`, err);
            });
          }
        }),
      );

      // Also lazy-load on file open (tab switch — language already known)
      disposables.push(
        ctx.on(FileEvents.Open, (payload: unknown) => {
          const { uri } = payload as { uri?: string };
          if (uri) {
            // Defer to let the model be set in the editor first
            setTimeout(() => {
              const { editor, monaco: m } = ctx!;
              const model = editor.getModel();
              if (model) {
                const lang = model.getLanguageId();
                api.loadLanguage(lang).then((fetched) => {
                  if (fetched && ctx) {
                    registerMonacoProviders(m, lang, engine);
                  }
                }).catch(() => {});
              }
            }, 50);
          }
        }),
      );
    },

    onDispose(): void {
      for (const d of disposables) d.dispose();
      disposables.length = 0;
      lazyLoader.reset();
      engine.clearAll();
      ctx = null;
    },
  };

  return { plugin, api };
}
