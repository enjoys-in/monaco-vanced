// ── Marketplace Module — Shared Types ────────────────────────

export interface MarketplaceEntry {
  id: string;
  name: string;
  publisher: string;
  version: string;
  description: string;
  downloads: number;
  rating: number;
  categories: string[];
  icon?: string;
  lastUpdated?: number;
}

export interface SearchOptions {
  query?: string;
  category?: string;
  sortBy?: "relevance" | "downloads" | "rating" | "name";
  page?: number;
  limit?: number;
}

export interface MarketplaceConfig {
  registryUrl?: string;
}

export interface MarketplaceModuleAPI {
  search(options: SearchOptions): Promise<MarketplaceEntry[]>;
  getExtension(id: string): Promise<MarketplaceEntry | null>;
  install(id: string): Promise<void>;
  getPopular(limit?: number): Promise<MarketplaceEntry[]>;
  getCategories(): Promise<string[]>;
}
