// ── Extension Module — Shared Types ──────────────────────────

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  publisher: string;
  engines: { monacoVanced: string };
  activationEvents: string[];
  contributes?: Record<string, unknown>;
  permissions?: string[];
  description?: string;
  main?: string;
}

export type ExtensionState = "installed" | "enabled" | "disabled" | "error";

export interface Extension {
  manifest: ExtensionManifest;
  state: ExtensionState;
  sandbox?: { type: "worker" | "iframe"; instance: unknown };
  lastUpdated: number;
  errorMessage?: string;
}

export interface ExtensionConfig {
  maxExtensions?: number;
  sandboxType?: "worker" | "iframe";
}

export interface ExtensionModuleAPI {
  install(manifest: ExtensionManifest, code?: string): Promise<void>;
  uninstall(extensionId: string): Promise<void>;
  enable(extensionId: string): void;
  disable(extensionId: string): void;
  getAll(): Extension[];
  getExtension(extensionId: string): Extension | undefined;
  reload(extensionId: string): Promise<void>;
}
