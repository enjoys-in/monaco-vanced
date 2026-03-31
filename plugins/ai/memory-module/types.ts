// ── Memory Module Types ────────────────────────────────────

export interface MemoryEntry {
  readonly id: string;
  readonly key: string;
  readonly value: string;
  readonly category: "convention" | "summary" | "task" | "preference" | "custom";
  readonly source: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface MemoryModuleAPI {
  store(key: string, value: string, category?: MemoryEntry["category"]): void;
  get(key: string): MemoryEntry | undefined;
  getByCategory(category: MemoryEntry["category"]): MemoryEntry[];
  getAll(): MemoryEntry[];
  remove(key: string): void;
  clear(): void;
  inject(): string;
}

export interface MemoryPluginOptions {
  readonly maxEntries?: number;
  readonly persistKey?: string;
}
