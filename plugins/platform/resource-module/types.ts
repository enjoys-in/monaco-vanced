// ── Resource Module — Types ───────────────────────────────────

import type { IDisposable } from "@core/types";

export interface ResourceEntry {
  type: string;
  key: string;
  disposable: IDisposable;
  owner?: string;
  group?: string;
  refCount: number;
  createdAt: number;
}

export interface LeakReport {
  type: string;
  key: string;
  ageSec: number;
  owner?: string;
}

export interface DisposeGroup {
  id: string;
  entries: string[];
}

export interface ResourceConfig {
  leakScanInterval?: number;
  graceMs?: number;
}

export interface ResourceModuleAPI {
  register(type: string, key: string, disposable: IDisposable, opts?: { owner?: string; group?: string }): void;
  dispose(key: string): void;
  disposeGroup(groupId: string): void;
  getLeaks(): LeakReport[];
  onLeak(handler: (data?: unknown) => void): IDisposable;
  addRef(key: string): void;
  releaseRef(key: string): void;
}
