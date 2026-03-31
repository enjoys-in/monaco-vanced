// ── Core type contracts ──────────────────────────────────────

export interface IDisposable {
  dispose(): void;
}

export interface MonacoPlugin {
  readonly id: string;
  readonly name: string;
  init(ctx: ModuleContext): void | Promise<void>;
  destroy?(): void | Promise<void>;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  dependencies?: string[];
}

export interface ModuleContext {
  readonly pluginId: string;
  readonly eventBus: import("./event-bus").EventBus;
  registerDisposable(disposable: IDisposable): void;
}
