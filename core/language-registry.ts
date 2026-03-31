// ── Language registry — tracks registered language IDs to prevent duplicates ──

export class LanguageRegistry {
  private registered = new Set<string>();

  /**
   * Returns true if the language was newly registered, false if already known.
   */
  register(languageId: string): boolean {
    if (this.registered.has(languageId)) return false;
    this.registered.add(languageId);
    return true;
  }

  has(languageId: string): boolean {
    return this.registered.has(languageId);
  }

  unregister(languageId: string): void {
    this.registered.delete(languageId);
  }

  getAll(): string[] {
    return [...this.registered];
  }

  clear(): void {
    this.registered.clear();
  }
}