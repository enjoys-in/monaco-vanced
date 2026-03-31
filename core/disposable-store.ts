// ── Disposable store — tracks IDisposable per plugin, bulk dispose on teardown ──

import type { IDisposable } from "./types";

export class DisposableStore implements IDisposable {
  private disposables: IDisposable[] = [];
  private disposed = false;

  add<T extends IDisposable>(disposable: T): T {
    if (this.disposed) {
      disposable.dispose();
      return disposable;
    }
    this.disposables.push(disposable);
    return disposable;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const toDispose = this.disposables.splice(0);
    for (const d of toDispose) {
      try {
        d.dispose();
      } catch (err) {
        console.error("[DisposableStore] Dispose error:", err);
      }
    }
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  get size(): number {
    return this.disposables.length;
  }
}

/**
 * Converts a cleanup function into an IDisposable.
 */
export function toDisposable(fn: () => void): IDisposable {
  return { dispose: fn };
}