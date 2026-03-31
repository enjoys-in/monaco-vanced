// ── VSIX Module — Fetcher ────────────────────────────────────

import { VSIXCache } from "./cache";

const DEFAULT_CDN = "https://open-vsx.org/api";

export class VSIXFetcher {
  private cdnUrl: string;
  private cache: VSIXCache;

  constructor(cdnUrl?: string, cache?: VSIXCache) {
    this.cdnUrl = (cdnUrl ?? DEFAULT_CDN).replace(/\/$/, "");
    this.cache = cache ?? new VSIXCache();
  }

  /** Fetch a VSIX package as ArrayBuffer */
  async fetch(id: string, version?: string): Promise<ArrayBuffer> {
    const cacheKey = version ? `${id}@${version}` : id;

    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Parse publisher.name format
    const [publisher, name] = this.parseId(id);
    const versionPath = version ? `/${encodeURIComponent(version)}` : "";
    const url = `${this.cdnUrl}/${encodeURIComponent(publisher)}/${encodeURIComponent(name)}${versionPath}/file/${encodeURIComponent(publisher)}.${encodeURIComponent(name)}-${version ?? "latest"}.vsix`;

    const response = await fetch(url);
    if (!response.ok) {
      // Try alternative download endpoint
      const altUrl = `${this.cdnUrl}/${encodeURIComponent(publisher)}/${encodeURIComponent(name)}${versionPath}`;
      const altResponse = await fetch(altUrl, {
        headers: { Accept: "application/octet-stream" },
      });
      if (!altResponse.ok) {
        throw new Error(`Failed to fetch VSIX "${id}": ${altResponse.statusText}`);
      }
      const buffer = await altResponse.arrayBuffer();
      await this.cache.set(cacheKey, buffer);
      return buffer;
    }

    const buffer = await response.arrayBuffer();
    await this.cache.set(cacheKey, buffer);
    return buffer;
  }

  private parseId(id: string): [string, string] {
    const parts = id.split(".");
    if (parts.length < 2) {
      throw new Error(`Invalid extension ID "${id}" — expected "publisher.name" format`);
    }
    return [parts[0], parts.slice(1).join(".")];
  }
}
