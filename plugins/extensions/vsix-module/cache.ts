// ── VSIX Module — Cache ──────────────────────────────────────

const CACHE_NAME = "monaco-vsix-cache";

export class VSIXCache {
  private cacheName: string;

  constructor(cacheName = CACHE_NAME) {
    this.cacheName = cacheName;
  }

  /** Get cached VSIX data */
  async get(key: string): Promise<ArrayBuffer | null> {
    if (!("caches" in globalThis)) return null;
    try {
      const cache = await caches.open(this.cacheName);
      const response = await cache.match(this.toUrl(key));
      if (!response) return null;
      return response.arrayBuffer();
    } catch {
      return null;
    }
  }

  /** Store VSIX data in cache */
  async set(key: string, data: ArrayBuffer): Promise<void> {
    if (!("caches" in globalThis)) return;
    try {
      const cache = await caches.open(this.cacheName);
      const response = new Response(data, {
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Cached-At": String(Date.now()),
        },
      });
      await cache.put(this.toUrl(key), response);
    } catch {
      // Cache write failed — non-critical
    }
  }

  /** Check if key exists in cache */
  async has(key: string): Promise<boolean> {
    if (!("caches" in globalThis)) return false;
    try {
      const cache = await caches.open(this.cacheName);
      const response = await cache.match(this.toUrl(key));
      return response !== undefined;
    } catch {
      return false;
    }
  }

  /** Clear all cached VSIX data */
  async clear(): Promise<void> {
    if (!("caches" in globalThis)) return;
    try {
      await caches.delete(this.cacheName);
    } catch {
      // Ignore clear failures
    }
  }

  private toUrl(key: string): string {
    return `/vsix-cache/${encodeURIComponent(key)}`;
  }
}
