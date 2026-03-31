// ── Sources ────────────────────────────────────────────────
// Source registry for context fusion.

import type { FusionSource } from "./types";

export class SourceRegistry {
  private sources = new Map<string, FusionSource>();

  register(source: FusionSource): void {
    this.sources.set(source.id, source);
  }

  remove(id: string): void {
    this.sources.delete(id);
  }

  get(id: string): FusionSource | undefined {
    return this.sources.get(id);
  }

  getAll(): FusionSource[] {
    return Array.from(this.sources.values());
  }

  getByIds(ids: string[]): FusionSource[] {
    return ids.map((id) => this.sources.get(id)).filter(Boolean) as FusionSource[];
  }
}
