// ── Marketplace Module — API Client ──────────────────────────

import type { MarketplaceEntry, SearchOptions } from "./types";

export class MarketplaceClient {
  private baseUrl: string;

  constructor(registryUrl = "/api/marketplace") {
    this.baseUrl = registryUrl.replace(/\/$/, "");
  }

  /** Search extensions in the marketplace */
  async search(options: SearchOptions): Promise<MarketplaceEntry[]> {
    const params = new URLSearchParams();
    if (options.query) params.set("q", options.query);
    if (options.category) params.set("category", options.category);
    if (options.sortBy) params.set("sortBy", options.sortBy);
    if (options.page) params.set("page", String(options.page));
    if (options.limit) params.set("limit", String(options.limit));

    const response = await fetch(`${this.baseUrl}/search?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Marketplace search failed: ${response.statusText}`);
    }
    return (await response.json()) as MarketplaceEntry[];
  }

  /** Get a single extension by ID */
  async getExtension(id: string): Promise<MarketplaceEntry | null> {
    const response = await fetch(`${this.baseUrl}/extensions/${encodeURIComponent(id)}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Failed to get extension "${id}": ${response.statusText}`);
    }
    return (await response.json()) as MarketplaceEntry;
  }

  /** Get popular extensions */
  async getPopular(limit = 20): Promise<MarketplaceEntry[]> {
    const response = await fetch(`${this.baseUrl}/popular?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Failed to get popular extensions: ${response.statusText}`);
    }
    return (await response.json()) as MarketplaceEntry[];
  }

  /** Get all categories */
  async getCategories(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/categories`);
    if (!response.ok) {
      throw new Error(`Failed to get categories: ${response.statusText}`);
    }
    return (await response.json()) as string[];
  }

  /** Download extension package */
  async download(id: string): Promise<ArrayBuffer> {
    const response = await fetch(`${this.baseUrl}/extensions/${encodeURIComponent(id)}/download`);
    if (!response.ok) {
      throw new Error(`Failed to download extension "${id}": ${response.statusText}`);
    }
    return response.arrayBuffer();
  }
}
