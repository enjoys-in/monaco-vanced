// ── API Stability Module Types ─────────────────────────────

export interface DeprecationEntry {
  api: string;
  since: string;
  replacement?: string;
  removeBy?: string;
  message?: string;
}

export interface APIVersion {
  major: number;
  minor: number;
  patch: number;
  label?: string;
}

export interface Shim {
  api: string;
  handler: (...args: unknown[]) => unknown;
  expires?: string;
}

export interface APIStabilityConfig {
  currentVersion?: APIVersion;
  warnOnDeprecated?: boolean;
}

export interface APIStabilityModuleAPI {
  deprecate(entry: DeprecationEntry): void;
  getDeprecations(): DeprecationEntry[];
  getVersion(): APIVersion;
  setVersion(v: APIVersion): void;
  createShim(shim: Shim): void;
  removeShim(api: string): void;
}
