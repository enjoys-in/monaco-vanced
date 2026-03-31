// ── Marketplace Module — Search Engine ───────────────────────

import type { MarketplaceEntry, SearchOptions } from "./types";

export class SearchEngine {
  private entries: MarketplaceEntry[] = [];

  /** Update the local search index */
  setEntries(entries: MarketplaceEntry[]): void {
    this.entries = entries;
  }

  /** Add an entry to the index */
  addEntry(entry: MarketplaceEntry): void {
    const idx = this.entries.findIndex((e) => e.id === entry.id);
    if (idx >= 0) {
      this.entries[idx] = entry;
    } else {
      this.entries.push(entry);
    }
  }

  /** Search with fuzzy matching and filtering */
  search(options: SearchOptions): MarketplaceEntry[] {
    let results = [...this.entries];

    // Category filter
    if (options.category) {
      results = results.filter((e) =>
        e.categories.some((c) => c.toLowerCase() === options.category!.toLowerCase()),
      );
    }

    // Query fuzzy match
    if (options.query) {
      const query = options.query.toLowerCase();
      results = results
        .map((entry) => ({
          entry,
          score: this.fuzzyScore(query, entry),
        }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((r) => r.entry);
    }

    // Sort
    if (options.sortBy && options.sortBy !== "relevance") {
      results = this.sortResults(results, options.sortBy);
    }

    // Pagination
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const start = (page - 1) * limit;
    return results.slice(start, start + limit);
  }

  private fuzzyScore(query: string, entry: MarketplaceEntry): number {
    let score = 0;
    const name = entry.name.toLowerCase();
    const desc = entry.description.toLowerCase();
    const publisher = entry.publisher.toLowerCase();

    // Exact name match
    if (name === query) return 100;
    // Name starts with query
    if (name.startsWith(query)) score += 50;
    // Name contains query
    else if (name.includes(query)) score += 30;
    // Publisher match
    if (publisher.includes(query)) score += 20;
    // Description contains query
    if (desc.includes(query)) score += 10;
    // Individual word matching
    const words = query.split(/\s+/);
    for (const word of words) {
      if (name.includes(word)) score += 5;
      if (desc.includes(word)) score += 2;
    }

    return score;
  }

  private sortResults(
    results: MarketplaceEntry[],
    sortBy: "downloads" | "rating" | "name",
  ): MarketplaceEntry[] {
    return results.sort((a, b) => {
      switch (sortBy) {
        case "downloads":
          return b.downloads - a.downloads;
        case "rating":
          return b.rating - a.rating;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }
}
