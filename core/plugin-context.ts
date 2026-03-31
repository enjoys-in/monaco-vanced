// ── Plugin context — wraps services for each plugin ──

import type { IDisposable, ModuleContext } from "./types";
import type { EventBus } from "./event-bus";

export class PluginContext implements ModuleContext {
  private disposables: IDisposable[] = [];

  constructor(
    public readonly pluginId: string,
    public readonly eventBus: EventBus,
  ) {}

  registerDisposable(disposable: IDisposable): void {
    this.disposables.push(disposable);
  }

  dispose(): void {
    for (const d of this.disposables) {
      try {
        d.dispose();
      } catch (err) {
        console.error(`[PluginContext] Dispose error in ${this.pluginId}:`, err);
      }
    }
    this.disposables = [];
  }
}
