// ── Theme Module — Dexie IndexedDB Store ─────────────────────
// Caches: theme index (_index.json) and individual theme JSON files.

import Dexie, { type EntityTable } from "dexie";
import type { ThemeIndexEntry, CachedTheme, ThemeDefinition } from "./types";

// ── DB shape ─────────────────────────────────────────────────

interface ThemeIndexRecord {
  key: string; // always "index"
  entries: ThemeIndexEntry[];
  fetchedAt: number;
}

class ThemeCacheDB extends Dexie {
  themeIndex!: EntityTable<ThemeIndexRecord, "key">;
  themes!: EntityTable<CachedTheme, "id">;

  constructor() {
    super("monaco-vanced-themes");

    this.version(1).stores({
      themeIndex: "key",
      themes: "id",
    });
  }
}

const db = new ThemeCacheDB();

// ── Public API ───────────────────────────────────────────────

export async function getCachedIndex(): Promise<ThemeIndexEntry[] | null> {
  const record = await db.themeIndex.get("index");
  return record?.entries ?? null;
}

export async function setCachedIndex(entries: ThemeIndexEntry[]): Promise<void> {
  await db.themeIndex.put({ key: "index", entries, fetchedAt: Date.now() });
}

export async function getCachedTheme(id: string): Promise<ThemeDefinition | null> {
  const record = await db.themes.get(id);
  return record?.data ?? null;
}

export async function setCachedTheme(id: string, data: ThemeDefinition): Promise<void> {
  await db.themes.put({ id, data, fetchedAt: Date.now() });
}

export async function clearThemeCache(): Promise<void> {
  await db.themeIndex.clear();
  await db.themes.clear();
}
