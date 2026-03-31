// ── Storage Module — Types ─────────────────────────────────────

export type StorageBackend = "idb" | "opfs" | "session";

export interface StorageEntry {
  key: string;
  value: unknown;
  ttl?: number;
  createdAt: number;
}

export interface StorageConfig {
  backend?: StorageBackend;
  namespace?: string;
}

export interface StorageModuleAPI {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  remove(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
  getSize(): Promise<number>;
}

export interface StorageDriver {
  get(key: string): Promise<StorageEntry | undefined>;
  set(entry: StorageEntry): Promise<void>;
  remove(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
  size(): Promise<number>;
}
