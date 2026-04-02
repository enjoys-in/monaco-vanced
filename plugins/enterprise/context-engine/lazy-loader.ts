// ── Context Engine Lazy Loader ─────────────────────────────
// Fetches language packs from CDN on demand — only when a file is opened
// for a language that has NO active LSP connection.
// First checks LSP health; if the server is reachable, defers to LSP.

import type { ContextEngineManifest, ManifestLanguageEntry, LanguageFileMap } from "./interfaces/manifest";
import type { ContextEngineAPI } from "./api";
import { checkLspHealth } from "../../language/lsp-bridge-module/health";

const DEFAULT_CDN_BASE = "https://cdn.jsdelivr.net/npm/@enjoys/context-engine/data";

export interface LazyLoaderConfig {
  cdnBaseUrl?: string;
  /** LSP server base URL — used for /api/health check before CDN fallback */
  lspBaseUrl?: string;
  /** Health check timeout in ms (default: 5 000) */
  healthTimeoutMs?: number;
}

export class LazyContextLoader {
  private readonly api: ContextEngineAPI;
  private readonly cdnBase: string;
  private readonly lspBaseUrl: string | null;
  private readonly healthTimeoutMs: number;

  /** Languages with an active LSP connection */
  private readonly lspConnected = new Set<string>();

  /** Languages already fetched (or currently fetching) */
  private readonly fetched = new Set<string>();

  /** Cached manifest (fetched once) */
  private manifest: ContextEngineManifest | null = null;
  private manifestPromise: Promise<ContextEngineManifest | null> | null = null;

  /** Cached LSP health state (null = not checked yet) */
  private lspHealthy: boolean | null = null;
  private healthPromise: Promise<boolean> | null = null;

  constructor(api: ContextEngineAPI, config: LazyLoaderConfig = {}) {
    this.api = api;
    this.cdnBase = (config.cdnBaseUrl ?? DEFAULT_CDN_BASE).replace(/\/+$/, "");
    this.lspBaseUrl = config.lspBaseUrl ?? null;
    this.healthTimeoutMs = config.healthTimeoutMs ?? 5000;
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
   *
   * Flow:
   *  1. If LSP already connected for this language → skip
   *  2. If already fetched → skip
   *  3. If lspBaseUrl configured → check /api/health
   *     - healthy → skip (LSP will handle it)
   *     - unhealthy → fall through to CDN
   *  4. Fetch manifest + language packs from CDN
   */
  async loadForLanguage(
    languageId: string,
    onStart?: () => void,
    onComplete?: (providerCount: number) => void,
    onFail?: (error: string) => void,
    onManifestLoaded?: () => void,
    onHealthOk?: () => void,
    onHealthFailed?: () => void,
  ): Promise<boolean> {
    // Skip if LSP is handling this language
    if (this.lspConnected.has(languageId)) return false;

    // Skip if already fetched
    if (this.fetched.has(languageId)) return false;

    // ── LSP health check (if configured) ──────────────────
    if (this.lspBaseUrl) {
      const healthy = await this.checkHealth();
      if (healthy) {
        // LSP server is reachable — let it handle language features
        onHealthOk?.();
        return false;
      }
      // Server unreachable — fall back to CDN
      onHealthFailed?.();
    }

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

  // ── LSP health check ─────────────────────────────────────

  /**
   * Check LSP server health. Result is cached for 30 s to avoid
   * hammering the health endpoint on rapid file switches.
   */
  private async checkHealth(): Promise<boolean> {
    if (!this.lspBaseUrl) return false;

    // Return cached result if still fresh
    if (this.lspHealthy !== null) return this.lspHealthy;

    // Deduplicate concurrent health checks
    if (!this.healthPromise) {
      this.healthPromise = checkLspHealth(this.lspBaseUrl, this.healthTimeoutMs).then((ok) => {
        this.lspHealthy = ok;
        // Expire after 30 s so we re-check periodically
        setTimeout(() => { this.lspHealthy = null; this.healthPromise = null; }, 30_000);
        return ok;
      });
    }
    return this.healthPromise;
  }

  /** Force re-check on next request (called when LspEvents.Disconnected fires) */
  invalidateHealth(): void {
    this.lspHealthy = null;
    this.healthPromise = null;
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
    this.lspHealthy = null;
    this.healthPromise = null;
  }
}
