// ── Language data Dexie store — caches CDN manifest + per-language provider data ──
import Dexie, { type EntityTable } from "dexie";

// ── CDN manifest shape ───────────────────────────────────────

export interface ManifestLanguageEntry {
  id: string;
  name: string;
  files: Record<string, string>;
}

export interface CDNManifest {
  version: string;
  generatedAt: string;
  totalLanguages: number;
  totalProviders: number;
  languages: ManifestLanguageEntry[];
}

// ── Symbol pattern (from CDN documentSymbol/*.json) ──────────

export interface CDNSymbolPattern {
  name: string;
  pattern: string;
  captureGroup: number;
  kind: number;
  type: string;
}

export interface CDNDocumentSymbolData {
  language: string;
  symbolPatterns: CDNSymbolPattern[];
}

// ── Dexie records ────────────────────────────────────────────

interface ManifestRecord {
  key: string; // always "manifest"
  data: CDNManifest;
  version: string;
  fetchedAt: number;
}

interface LangDataRecord {
  /** Composite key: `${langId}::${provider}` e.g. "typescript::documentSymbol" */
  key: string;
  langId: string;
  provider: string;
  data: unknown;
  fetchedAt: number;
}

// ── DB ───────────────────────────────────────────────────────

class LangDataDB extends Dexie {
  manifest!: EntityTable<ManifestRecord, "key">;
  langData!: EntityTable<LangDataRecord, "key">;

  constructor() {
    super("monaco-vanced-lang-data");
    this.version(1).stores({
      manifest: "key",
      langData: "key, langId, provider",
    });
  }
}

const db = new LangDataDB();

// ── Public API ───────────────────────────────────────────────

export async function getCachedManifest(): Promise<{
  data: CDNManifest;
  version: string;
} | null> {
  const record = await db.manifest.get("manifest");
  if (!record) return null;
  return { data: record.data, version: record.version };
}

export async function setCachedManifest(
  data: CDNManifest,
  version: string,
): Promise<void> {
  await db.manifest.put({
    key: "manifest",
    data,
    version,
    fetchedAt: Date.now(),
  });
}

export async function getCachedLangData<T = unknown>(
  langId: string,
  provider: string,
): Promise<T | null> {
  const record = await db.langData.get(`${langId}::${provider}`);
  return (record?.data as T) ?? null;
}

export async function setCachedLangData(
  langId: string,
  provider: string,
  data: unknown,
): Promise<void> {
  await db.langData.put({
    key: `${langId}::${provider}`,
    langId,
    provider,
    data,
    fetchedAt: Date.now(),
  });
}

export async function clearLangDataForVersion(): Promise<void> {
  await db.langData.clear();
}

export async function clearAllLangData(): Promise<void> {
  await db.manifest.clear();
  await db.langData.clear();
}
