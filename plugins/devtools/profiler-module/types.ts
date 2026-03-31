// ── Profiler Module — Shared Types ───────────────────────────

export interface FlameNode {
  id: string;
  name: string;
  file: string;
  line: number;
  selfTime: number;
  totalTime: number;
  children: FlameNode[];
}

export interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
}

export interface ProfilerConfig {
  sampleInterval?: number;
  maxDuration?: number;
}

export interface ProfilerModuleAPI {
  startProfiling(): void;
  stopProfiling(): FlameNode | null;
  getFlameGraph(): FlameNode | null;
  takeMemorySnapshot(): MemorySnapshot;
  getMemoryHistory(): MemorySnapshot[];
  clear(): void;
}
