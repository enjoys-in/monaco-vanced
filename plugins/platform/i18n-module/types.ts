// ── i18n Module — Types ──────────────────────────────────────

export type Locale = string; // e.g. "en", "fr", "ja"

export interface TranslationBundle {
  locale: Locale;
  messages: Record<string, string>;
}

export interface I18nConfig {
  defaultLocale?: Locale;
  fallbackLocale?: Locale;
  bundles?: TranslationBundle[];
}

export interface I18nModuleAPI {
  /** Get current locale */
  getLocale(): Locale;
  /** Set the active locale (loads translations if available) */
  setLocale(locale: Locale): void;
  /** Translate a key, with optional interpolation params */
  t(key: string, params?: Record<string, string | number>): string;
  /** Register a translation bundle for a locale */
  registerBundle(bundle: TranslationBundle): void;
  /** Get all registered locale codes */
  getAvailableLocales(): Locale[];
  /** Check if a translation exists for a key */
  has(key: string): boolean;
}
