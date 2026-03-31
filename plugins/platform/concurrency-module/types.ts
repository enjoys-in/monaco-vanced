// ── Concurrency Module — Types ────────────────────────────────

export interface SemaphoreConfig {
  domain: string;
  max: number;
}

export interface MutexHandle {
  key: string;
  release: () => void;
}

export interface ConcurrencyConfig {
  defaultTimeout?: number;
}

export interface ConcurrencyModuleAPI {
  dedupe<T>(key: string, fn: () => Promise<T>): Promise<T>;
  cancelPrevious<T>(key: string, fn: (signal: AbortSignal) => Promise<T>): Promise<T>;
  semaphore(domain: string, max: number): { acquire: () => Promise<void>; release: () => void };
  mutex<T>(key: string, fn: () => Promise<T>): Promise<T>;
  getAbortSignal(key: string): AbortSignal;
}
