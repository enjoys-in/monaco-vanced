// ── Dialog Module — Trust Store ────────────────────────────────
// Manages trusted domains/origins for authorization checks.

const TRUST_STORAGE_KEY = "monaco-vanced-trust-store";

export class TrustStore {
  private trusted = new Set<string>();

  constructor() {
    this.restore();
  }

  trust(domain: string): void {
    this.trusted.add(this.normalize(domain));
    this.persist();
  }

  untrust(domain: string): void {
    this.trusted.delete(this.normalize(domain));
    this.persist();
  }

  isAuthorized(domain: string): boolean {
    return this.trusted.has(this.normalize(domain));
  }

  getTrusted(): string[] {
    return Array.from(this.trusted);
  }

  clear(): void {
    this.trusted.clear();
    localStorage.removeItem(TRUST_STORAGE_KEY);
  }

  get size(): number {
    return this.trusted.size;
  }

  private normalize(domain: string): string {
    try {
      const url = new URL(domain.includes("://") ? domain : `https://${domain}`);
      return url.hostname.toLowerCase();
    } catch {
      return domain.toLowerCase().trim();
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(TRUST_STORAGE_KEY, JSON.stringify(Array.from(this.trusted)));
    } catch {
      // silent fail
    }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(TRUST_STORAGE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        for (const d of arr) this.trusted.add(d);
      }
    } catch {
      // silent fail
    }
  }
}
