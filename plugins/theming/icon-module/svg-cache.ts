// ── Icon Module — SVG Cache ──────────────────────────────────

const CACHE_NAME = "monaco-icon-cache";

export class SVGCache {
  private memoryCache = new Map<string, string>();
  private cacheName: string;
  private enabled: boolean;

  constructor(enabled = true, cacheName = CACHE_NAME) {
    this.enabled = enabled;
    this.cacheName = cacheName;
  }

  /** Get cached SVG string */
  async get(iconName: string): Promise<string | undefined> {
    // Check memory cache first
    const mem = this.memoryCache.get(iconName);
    if (mem) return mem;

    if (!this.enabled || !("caches" in globalThis)) return undefined;

    try {
      const cache = await caches.open(this.cacheName);
      const response = await cache.match(this.toUrl(iconName));
      if (!response) return undefined;
      const svg = await response.text();
      this.memoryCache.set(iconName, svg);
      return svg;
    } catch {
      return undefined;
    }
  }

  /** Store SVG string in cache */
  async set(iconName: string, svg: string): Promise<void> {
    this.memoryCache.set(iconName, svg);

    if (!this.enabled || !("caches" in globalThis)) return;

    try {
      const cache = await caches.open(this.cacheName);
      const response = new Response(svg, {
        headers: { "Content-Type": "image/svg+xml" },
      });
      await cache.put(this.toUrl(iconName), response);
    } catch {
      // Cache write failed — non-critical
    }
  }

  /** Preload multiple icons into cache */
  async preload(iconNames: string[], fetchSvg: (name: string) => Promise<string>): Promise<void> {
    const uncached = iconNames.filter((name) => !this.memoryCache.has(name));
    await Promise.allSettled(
      uncached.map(async (name) => {
        const svg = await fetchSvg(name);
        await this.set(name, svg);
      }),
    );
  }

  /** Clear the cache */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    if ("caches" in globalThis) {
      try {
        await caches.delete(this.cacheName);
      } catch {
        // Ignore
      }
    }
  }

  private toUrl(iconName: string): string {
    return `/icon-cache/${encodeURIComponent(iconName)}.svg`;
  }
}
