// ── Secrets Module Types ───────────────────────────────────

export interface Secret {
  key: string;
  value: string;
  provider: string;
  metadata?: Record<string, unknown>;
}

export interface SecretProvider {
  name: string;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
}

export interface InjectorConfig {
  pattern: RegExp;
  replacement: (key: string) => string;
}

export interface SecretsConfig {
  defaultProvider?: string;
  providers?: SecretProvider[];
}

export interface SecretsModuleAPI {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
  inject(template: string): Promise<string>;
  addProvider(name: string, provider: SecretProvider): void;
}
