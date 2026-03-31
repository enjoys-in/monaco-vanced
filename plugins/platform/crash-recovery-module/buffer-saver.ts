// ── Crash Recovery Module — BufferSaver ───────────────────────

export class BufferSaver {
  private readonly buffers = new Map<string, string>();
  private readonly storageKey: string;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs: number;

  constructor(storageKey = "monaco-unsaved-buffers", debounceMs = 2000) {
    this.storageKey = storageKey;
    this.debounceMs = debounceMs;
    this.loadFromStorage();
  }

  save(file: string, content: string): void {
    this.buffers.set(file, content);
    this.debouncedFlush();
  }

  getAll(): Map<string, string> {
    return new Map(this.buffers);
  }

  get(file: string): string | undefined {
    return this.buffers.get(file);
  }

  remove(file: string): void {
    this.buffers.delete(file);
    this.flush();
  }

  clear(): void {
    this.buffers.clear();
    try {
      localStorage.removeItem(this.storageKey);
    } catch {}
  }

  private debouncedFlush(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.flush(), this.debounceMs);
  }

  private flush(): void {
    try {
      const data: Record<string, string> = {};
      for (const [k, v] of this.buffers) data[k] = v;
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn("[buffer-saver] Failed to persist:", e);
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const data = JSON.parse(raw) as Record<string, string>;
      for (const [k, v] of Object.entries(data)) {
        this.buffers.set(k, v);
      }
    } catch {}
  }

  dispose(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.flush();
  }
}
