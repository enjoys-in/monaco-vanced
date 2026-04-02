// ── i18n Module — Plugin Entry ────────────────────────────────

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { I18nConfig, I18nModuleAPI, Locale, TranslationBundle } from "./types";
import { I18nEvents } from "@core/events";

export type { I18nConfig, I18nModuleAPI, Locale, TranslationBundle } from "./types";

export function createI18nPlugin(config: I18nConfig = {}): {
  plugin: MonacoPlugin;
  api: I18nModuleAPI;
} {
  const fallbackLocale = config.fallbackLocale ?? "en";
  let currentLocale: Locale = config.defaultLocale ?? fallbackLocale;
  const bundles = new Map<Locale, Map<string, string>>();
  let ctx: PluginContext | null = null;

  // Seed initial bundles
  for (const bundle of config.bundles ?? []) {
    bundles.set(bundle.locale, new Map(Object.entries(bundle.messages)));
  }

  function resolveMessage(key: string, locale: Locale): string | undefined {
    return bundles.get(locale)?.get(key);
  }

  function interpolate(template: string, params?: Record<string, string | number>): string {
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, name) => {
      const val = params[name];
      return val !== undefined ? String(val) : `{${name}}`;
    });
  }

  const api: I18nModuleAPI = {
    getLocale(): Locale {
      return currentLocale;
    },

    setLocale(locale: Locale): void {
      const prev = currentLocale;
      currentLocale = locale;
      ctx?.emit(I18nEvents.LocaleChanged, { from: prev, to: locale });
    },

    t(key: string, params?: Record<string, string | number>): string {
      // Try current locale, then fallback
      const msg = resolveMessage(key, currentLocale) ?? resolveMessage(key, fallbackLocale);
      if (msg === undefined) {
        ctx?.emit(I18nEvents.MissingKey, { key, locale: currentLocale });
        return key; // return the key itself as fallback
      }
      return interpolate(msg, params);
    },

    registerBundle(bundle: TranslationBundle): void {
      let map = bundles.get(bundle.locale);
      if (!map) {
        map = new Map();
        bundles.set(bundle.locale, map);
      }
      for (const [k, v] of Object.entries(bundle.messages)) {
        map.set(k, v);
      }
      ctx?.emit(I18nEvents.TranslationsLoaded, { locale: bundle.locale, count: Object.keys(bundle.messages).length });
    },

    getAvailableLocales(): Locale[] {
      return [...bundles.keys()];
    },

    has(key: string): boolean {
      return resolveMessage(key, currentLocale) !== undefined || resolveMessage(key, fallbackLocale) !== undefined;
    },
  };

  const plugin: MonacoPlugin = {
    id: "i18n-module",
    name: "Internationalization Module",
    version: "1.0.0",
    description: "Localization and translation support",

    onMount(pluginCtx) {
      ctx = pluginCtx;
    },

    onDispose() {
      bundles.clear();
      ctx = null;
    },
  };

  return { plugin, api };
}
