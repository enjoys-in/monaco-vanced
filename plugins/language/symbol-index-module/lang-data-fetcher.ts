// ── CDN language data fetcher — manifest versioned, lazy per-language ──
import {
  getCachedManifest,
  setCachedManifest,
  getCachedLangData,
  setCachedLangData,
  clearLangDataForVersion,
  type CDNManifest,
  type CDNDocumentSymbolData,
  type CDNSymbolPattern,
  type ManifestLanguageEntry,
} from "./lang-data-store";

const CDN_BASE =
  "https://cdn.jsdelivr.net/npm/@enjoys/context-engine@latest/data";

// ── Compiled pattern cache (in-memory, per session) ──────────

export interface CompiledSymbolPattern {
  name: string;
  regex: RegExp;
  captureGroup: number;
  kind: number;
  type: string;
}

/** langId → compiled patterns (memory only, rebuilt from CDN/IDB data) */
const compiledPatterns = new Map<string, CompiledSymbolPattern[]>();

/** langId → Set of provider names already fetched this session */
const fetchedProviders = new Map<string, Set<string>>();

/** Manifest language lookup: langId → ManifestLanguageEntry */
let manifestLangs: Map<string, ManifestLanguageEntry> | null = null;
let manifestVersion: string | null = null;

// ── Manifest ─────────────────────────────────────────────────

async function fetchManifestFromCDN(): Promise<CDNManifest> {
  const res = await fetch(`${CDN_BASE}/manifest.json`, { cache: "no-cache" });
  if (!res.ok)
    throw new Error(
      `[symbol-index] Failed to fetch manifest: HTTP ${res.status}`,
    );
  return res.json() as Promise<CDNManifest>;
}

export async function ensureManifest(): Promise<Map<string, ManifestLanguageEntry>> {
  if (manifestLangs) return manifestLangs;

  // Try IDB cache first
  const cached = await getCachedManifest();
  let manifest: CDNManifest;

  if (cached) {
    manifest = cached.data;
    manifestVersion = cached.version;
  } else {
    manifest = await fetchManifestFromCDN();
    manifestVersion = manifest.version;
    await setCachedManifest(manifest, manifest.version);
  }

  manifestLangs = new Map<string, ManifestLanguageEntry>();
  for (const lang of manifest.languages) {
    manifestLangs.set(lang.id, lang);
  }
  return manifestLangs;
}

/** Check if a newer manifest version exists; if so, bust the cache */
export async function checkManifestUpdate(): Promise<boolean> {
  try {
    const fresh = await fetchManifestFromCDN();
    if (manifestVersion && fresh.version !== manifestVersion) {
      // Version changed — clear per-language cache, update manifest
      await clearLangDataForVersion();
      compiledPatterns.clear();
      fetchedProviders.clear();
      manifestVersion = fresh.version;
      manifestLangs = new Map();
      for (const lang of fresh.languages) {
        manifestLangs.set(lang.id, lang);
      }
      await setCachedManifest(fresh, fresh.version);
      return true;
    }
  } catch {
    // Offline or CDN error — keep cached data
  }
  return false;
}

// ── Per-language provider data ────────────────────────────────

async function fetchProviderData<T>(
  langId: string,
  provider: string,
): Promise<T | null> {
  const langs = await ensureManifest();
  const entry = langs.get(langId);
  if (!entry) return null;

  const filePath = entry.files[provider];
  if (!filePath) return null;

  // Check IDB cache
  const cached = await getCachedLangData<T>(langId, provider);
  if (cached) return cached;

  // Fetch from CDN
  try {
    const res = await fetch(`${CDN_BASE}/${filePath}`);
    if (!res.ok) return null;
    const data = (await res.json()) as T;
    await setCachedLangData(langId, provider, data);
    return data;
  } catch {
    return null;
  }
}

// ── DocumentSymbol patterns (what IndexStore uses) ───────────

/**
 * Some CDN JSON patterns arrive double-escaped (e.g. `\\\\b` in JSON → `\\b` in JS
 * instead of the correct `\\b` in JSON → `\b` in JS).
 * Reduce `\\X` → `\X` for known regex escape tokens.
 * Avoids touching `\\\\` pairs inside character classes (e.g. `[\\w\\\\]`).
 */
function normalizePatternEscaping(pattern: string): string {
  return pattern.replace(/\\\\([bBwWsSdDtnr()[\]{}+*?.^$|])/g, "\\$1");
}

function compilePatterns(
  raw: CDNSymbolPattern[],
): CompiledSymbolPattern[] {
  const compiled: CompiledSymbolPattern[] = [];
  for (const p of raw) {
    // Try compiling the pattern as-is first (handles correctly-escaped CDN data).
    // If it fails, attempt to fix double-escaped sequences and retry.
    let regex: RegExp;
    try {
      regex = new RegExp(p.pattern, "gm");
    } catch {
      try {
        regex = new RegExp(normalizePatternEscaping(p.pattern), "gm");
      } catch {
        // Silently skip truly invalid patterns
        continue;
      }
    }
    compiled.push({
      name: p.name,
      regex,
      captureGroup: p.captureGroup,
      kind: p.kind,
      type: p.type,
    });
  }
  return compiled;
}

/**
 * Get compiled symbol patterns for a language.
 * Fetches from CDN/IDB on first call, then serves from memory.
 */
export async function getSymbolPatterns(
  langId: string,
): Promise<CompiledSymbolPattern[]> {
  // Memory cache hit
  const cached = compiledPatterns.get(langId);
  if (cached) return cached;

  const data = await fetchProviderData<CDNDocumentSymbolData>(
    langId,
    "documentSymbol",
  );
  if (!data?.symbolPatterns?.length) {
    // Store empty so we don't re-fetch
    compiledPatterns.set(langId, []);
    return [];
  }

  const compiled = compilePatterns(data.symbolPatterns);
  compiledPatterns.set(langId, compiled);
  return compiled;
}

/**
 * Pre-warm patterns for a set of languages (e.g. on boot).
 * Non-blocking — failures are silently ignored.
 */
export async function preloadSymbolPatterns(langIds: string[]): Promise<void> {
  await Promise.allSettled(langIds.map((id) => getSymbolPatterns(id)));
}

/**
 * Check if a language has CDN data available.
 */
export async function hasLanguageData(langId: string): Promise<boolean> {
  const langs = await ensureManifest();
  return langs.has(langId);
}

/**
 * Get the list of all supported language IDs from the manifest.
 */
export async function getSupportedLanguages(): Promise<string[]> {
  const langs = await ensureManifest();
  return Array.from(langs.keys());
}

/**
 * Get the raw CDN symbol patterns (uncompiled) for a language.
 * Used by the worker which needs to compile inside its own scope.
 */
export async function getRawSymbolPatterns(
  langId: string,
): Promise<CDNSymbolPattern[] | null> {
  const data = await fetchProviderData<CDNDocumentSymbolData>(
    langId,
    "documentSymbol",
  );
  return data?.symbolPatterns ?? null;
}
