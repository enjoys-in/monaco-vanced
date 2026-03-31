// ── Provider Registry ──────────────────────────────────────

export class ProviderRegistry {
  // Map<language, Map<providerName, data>>
  private readonly registry = new Map<string, Map<string, unknown>>();

  register(language: string, providerName: string, data: unknown): void {
    let langMap = this.registry.get(language);
    if (!langMap) {
      langMap = new Map();
      this.registry.set(language, langMap);
    }
    langMap.set(providerName, data);
  }

  get(language: string, providerName: string): unknown | undefined {
    return this.registry.get(language)?.get(providerName);
  }

  getAll(language: string): Map<string, unknown> {
    return this.registry.get(language) ?? new Map();
  }

  has(language: string, providerName?: string): boolean {
    const langMap = this.registry.get(language);
    if (!langMap) return false;
    return providerName ? langMap.has(providerName) : true;
  }

  getLanguages(): string[] {
    return [...this.registry.keys()];
  }

  remove(language: string, providerName?: string): void {
    if (providerName) {
      this.registry.get(language)?.delete(providerName);
    } else {
      this.registry.delete(language);
    }
  }
}
