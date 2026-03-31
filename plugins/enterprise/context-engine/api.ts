// ── Context Engine API ─────────────────────────────────────

import type { ContextEngineManifest, ManifestLanguageEntry } from "./interfaces/manifest";
import { ContextStorage } from "./storage";
import { ProviderRegistry } from "./providers";

export class ContextEngineAPI {
  private readonly storage: ContextStorage;
  private readonly providers: ProviderRegistry;
  private manifest: ContextEngineManifest | null = null;

  constructor(storage: ContextStorage, providers: ProviderRegistry) {
    this.storage = storage;
    this.providers = providers;
  }

  getProviderData(language: string, providerName: string): unknown | undefined {
    return this.providers.get(language, providerName);
  }

  registerProviderData(language: string, providerName: string, data: unknown): void {
    this.providers.register(language, providerName, data);
  }

  registerLanguage(entry: ManifestLanguageEntry): void {
    this.storage.set(`lang:${entry.id}`, entry);
  }

  getLanguageEntry(languageId: string): ManifestLanguageEntry | undefined {
    return this.storage.get<ManifestLanguageEntry>(`lang:${languageId}`);
  }

  setManifest(manifest: ContextEngineManifest): void {
    this.manifest = manifest;
  }

  getManifest(): ContextEngineManifest | null {
    return this.manifest;
  }

  getRegisteredLanguages(): string[] {
    return this.providers.getLanguages();
  }

  getAllProviders(language: string): Map<string, unknown> {
    return this.providers.getAll(language);
  }

  clearAll(): void {
    this.storage.clear();
    this.manifest = null;
  }
}
