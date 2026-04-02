// ── Context Engine Lazy Loader ─────────────────────────────
// Fetches language packs from CDN on demand — only when a file is opened
// for a language that has NO active LSP connection.

import type { ContextEngineManifest, ManifestLanguageEntry, LanguageFileMap } from "./interfaces/manifest";
import type { ContextEngineAPI } from "./api";

const DEFAULT_CDN_BASE = "https://cdn.jsdelivr.net/npm/@enjoys/context-engine/data";

export interface LazyLoaderConfig {
  cdnBaseUrl?: string;
}

export class LazyContextLoader {
  private readonly api: ContextEngineAPI;
  private readonly cdnBase: string;

  /** Languages with an active LSP connection */
  private readonly lspConnected = new Set<string>();

  /** Languages already fetched (or currently fetching) */
  private readonly fetched = new Set<string>();

  /** Cached manifest (fetched once) */
  private manifest: ContextEngineManifest | null = null;
  private manifestPromise: Promise<ContextEngineManifest | null> | null = null;

  constructor(api: ContextEngineAPI, config: LazyLoaderConfig = {}) {
    this.api = api;
    this.cdnBase = (config.cdnBaseUrl ?? DEFAULT_CDN_BASE).replace(/\/+$/, "");
  }

  // ── LSP tracking ────────────────────────────────────────

  markLspConnected(languageId: string): void {
    this.lspConnected.add(languageId);
  }

  markLspDisconnected(languageId: string): void {
    this.lspConnected.delete(languageId);
  }

  isLspConnected(languageId: string): boolean {
    return this.lspConnected.has(languageId);
  }

  // ── Core lazy-load entry ────────────────────────────────

  /**
   * Called when a file is opened / language changes.
   * Returns true if a fetch was triggered, false if skipped.
   */
  async loadForLanguage(
    languageId: string,
    onStart?: () => void,
    onComplete?: (providerCount: number) => void,
    onFail?: (error: string) => void,
    onManifestLoaded?: () => void,
  ): Promise<boolean> {
    // Skip if LSP is handling this language
    if (this.lspConnected.has(languageId)) return false;

    // Skip if already fetched
    if (this.fetched.has(languageId)) return false;

    // Mark as fetching to prevent duplicate requests
    this.fetched.add(languageId);
    onStart?.();

    try {
      // Fetch manifest once
      const manifest = await this.ensureManifest(onManifestLoaded);
      if (!manifest) {
        onFail?.("Failed to load manifest");
        this.fetched.delete(languageId);
        return false;
      }

      // Find this language in the manifest
      const langEntry = manifest.languages.find((l) => l.id === languageId);
      if (!langEntry) {
        // Language not available in CDN — not an error, just not supported
        return false;
      }

      // Register the language
      this.api.registerLanguage(langEntry);

      // Fetch provider packs for this language
      const providerCount = await this.fetchLanguagePacks(langEntry);
      onComplete?.(providerCount);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onFail?.(msg);
      this.fetched.delete(languageId);
      return false;
    }
  }

  // ── Manifest ────────────────────────────────────────────

  private async ensureManifest(
    onManifestLoaded?: () => void,
  ): Promise<ContextEngineManifest | null> {
    if (this.manifest) return this.manifest;

    // Deduplicate concurrent manifest fetches
    if (!this.manifestPromise) {
      this.manifestPromise = this.fetchManifest();
    }

    const manifest = await this.manifestPromise;
    if (manifest) {
      this.manifest = manifest;
      this.api.setManifest(manifest);
      onManifestLoaded?.();
    }
    return manifest;
  }

  private async fetchManifest(): Promise<ContextEngineManifest | null> {
    try {
      const url = `${this.cdnBase}/manifest.json`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return (await res.json()) as ContextEngineManifest;
    } catch {
      return null;
    }
  }

  // ── Per-language pack fetching ──────────────────────────

  private async fetchLanguagePacks(entry: ManifestLanguageEntry): Promise<number> {
    const files = entry.files as LanguageFileMap;
    const providerNames = Object.keys(files) as Array<keyof LanguageFileMap>;
    let loaded = 0;

    // Fetch all provider files for this language in parallel
    const results = await Promise.allSettled(
      providerNames.map(async (providerName) => {
        const filePath = files[providerName];
        if (!filePath) return null;

        const url = `${this.cdnBase}/${filePath}`;
        const res = await fetch(url);
        if (!res.ok) return null;

        const data = await res.json();
        this.api.registerProviderData(entry.id, providerName, data);
        return providerName;
      }),
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) loaded++;
    }

    return loaded;
  }

  // ── Reset (for testing / hot-reload) ────────────────────

  reset(): void {
    this.lspConnected.clear();
    this.fetched.clear();
    this.manifest = null;
    this.manifestPromise = null;
  }
}
