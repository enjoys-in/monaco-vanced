// ── Preloader ──────────────────────────────────────────────
// Prefetches predicted resources.

export class Preloader {
  private preloaded = new Set<string>();
  private onPreload?: (filePath: string) => void;

  constructor(onPreload?: (filePath: string) => void) {
    this.onPreload = onPreload;
  }

  preload(filePaths: string[]): void {
    for (const filePath of filePaths) {
      if (this.preloaded.has(filePath)) continue;
      this.preloaded.add(filePath);
      this.onPreload?.(filePath);
    }
  }

  isPreloaded(filePath: string): boolean {
    return this.preloaded.has(filePath);
  }

  clear(): void {
    this.preloaded.clear();
  }
}
