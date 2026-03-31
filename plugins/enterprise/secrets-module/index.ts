// ── Secrets Module ─────────────────────────────────────────

import type { MonacoPlugin, PluginContext } from "@core/types";
import type {
  InjectorConfig,
  Secret,
  SecretProvider,
  SecretsConfig,
  SecretsModuleAPI,
} from "./types";
import { SecretInjector } from "./injector";
import { SecretsEvents } from "@core/events";

export type { InjectorConfig, Secret, SecretProvider, SecretsConfig, SecretsModuleAPI };
export { SecretInjector };
export { VaultProvider } from "./providers/vault";
export { AWSSecretsProvider } from "./providers/aws";
export { DopplerProvider } from "./providers/doppler";

export function createSecretsPlugin(
  config: SecretsConfig = {},
): { plugin: MonacoPlugin; api: SecretsModuleAPI } {
  const providers = new Map<string, SecretProvider>();
  if (config.providers) {
    for (const p of config.providers) {
      providers.set(p.name, p);
    }
  }

  const injector = new SecretInjector(providers, config.defaultProvider);
  let ctx: PluginContext | null = null;

  const getProvider = (): SecretProvider => {
    const name = config.defaultProvider;
    if (name) {
      const p = providers.get(name);
      if (p) return p;
    }
    const first = providers.values().next();
    if (!first.done) return first.value;
    throw new Error("No secret provider configured");
  };

  const api: SecretsModuleAPI = {
    async get(key: string): Promise<string | null> {
      ctx?.emit(SecretsEvents.Access, { key, action: "get" });
      return getProvider().get(key);
    },

    async set(key: string, value: string): Promise<void> {
      ctx?.emit(SecretsEvents.Access, { key, action: "set" });
      return getProvider().set(key, value);
    },

    async delete(key: string): Promise<void> {
      ctx?.emit(SecretsEvents.Access, { key, action: "delete" });
      return getProvider().delete(key);
    },

    async list(): Promise<string[]> {
      return getProvider().list();
    },

    async inject(template: string): Promise<string> {
      return injector.inject(template);
    },

    addProvider(name: string, provider: SecretProvider): void {
      providers.set(name, provider);
    },
  };

  const plugin: MonacoPlugin = {
    id: "secrets-module",
    name: "Secrets Module",
    version: "1.0.0",
    description: "Secret management with Vault, AWS, and Doppler providers",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;
    },

    onDispose(): void {
      ctx = null;
    },
  };

  return { plugin, api };
}
