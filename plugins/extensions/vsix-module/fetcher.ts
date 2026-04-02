// ── VSIX Module — Fetcher ────────────────────────────────────

import { VSIXCache } from "./cache";

/** Open VSX registry base URL (shared across the module) */
export const OPENVSX_API = "https://open-vsx.org/api";

export class VSIXFetcher {
  private cdnUrl: string;
  private cache: VSIXCache;

  constructor(cdnUrl?: string, cache?: VSIXCache) {
    this.cdnUrl = (cdnUrl ?? OPENVSX_API).replace(/\/$/, "");
    this.cache = cache ?? new VSIXCache();
  }

  /** Get the base CDN/API URL */
  get baseUrl(): string { return this.cdnUrl; }

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

  /** Fetch extension metadata from the Open VSX API */
  async getMetadata(id: string): Promise<OpenVSXMetadata> {
    const [publisher, name] = this.parseId(id);
    const url = `${this.cdnUrl}/${encodeURIComponent(publisher)}/${encodeURIComponent(name)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch metadata for "${id}": HTTP ${res.status}`);
    return res.json();
  }

  /** Search the Open VSX registry */
  async search(query: string, opts: { size?: number; offset?: number; category?: string; sortBy?: string; sortOrder?: string } = {}): Promise<OpenVSXSearchResult> {
    const params = new URLSearchParams({ query });
    if (opts.size) params.set("size", String(opts.size));
    if (opts.offset) params.set("offset", String(opts.offset));
    if (opts.category) params.set("category", opts.category);
    if (opts.sortBy) params.set("sortBy", opts.sortBy);
    if (opts.sortOrder) params.set("sortOrder", opts.sortOrder);
    const url = `${this.cdnUrl}/-/search?${params}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Search failed: HTTP ${res.status}`);
    return res.json();
  }

  /** Fetch a text resource (e.g. README) by URL */
  async fetchText(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch: HTTP ${res.status}`);
    return res.text();
  }
}

// ── Open VSX API response types ──────────────────────────────

export interface OpenVSXMetadata {
  name: string;
  namespace: string;
  displayName?: string;
  version: string;
  description?: string;
  downloadCount?: number;
  averageRating?: number;
  reviewCount?: number;
  license?: string;
  categories?: string[];
  tags?: string[];
  publishedBy?: { loginName: string };
  repository?: string;
  bugs?: string;
  homepage?: string;
  files?: {
    icon?: string;
    readme?: string;
    changelog?: string;
    license?: string;
    download?: string;
  };
  timestamp?: string;
  allVersions?: Record<string, string>;
}

export interface OpenVSXSearchResult {
  totalSize: number;
  extensions: Array<{
    name: string;
    namespace: string;
    version: string;
    displayName?: string;
    description?: string;
    downloadCount?: number;
    averageRating?: number;
    reviewCount?: number;
    categories?: string[];
    tags?: string[];
    files?: { icon?: string };
    timestamp?: string;
  }>;
}
