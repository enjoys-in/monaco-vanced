// ── Auth Module — Token Store ─────────────────────────────────
// Secure token storage with base64 encoding wrapper.

export class TokenStore {
  private readonly prefix: string;

  constructor(storageKey = "monaco-vanced-auth") {
    this.prefix = storageKey;
  }

  set(key: string, value: string): void {
    try {
      const encoded = btoa(unescape(encodeURIComponent(value)));
      localStorage.setItem(`${this.prefix}:${key}`, encoded);
    } catch {
      console.warn("[token-store] Failed to store token for key:", key);
    }
  }

  get(key: string): string | null {
    try {
      const raw = localStorage.getItem(`${this.prefix}:${key}`);
      if (!raw) return null;
      return decodeURIComponent(escape(atob(raw)));
    } catch {
      return null;
    }
  }

  remove(key: string): void {
    localStorage.removeItem(`${this.prefix}:${key}`);
  }

  clear(): void {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(this.prefix)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  }

  has(key: string): boolean {
    return localStorage.getItem(`${this.prefix}:${key}`) !== null;
  }
}
