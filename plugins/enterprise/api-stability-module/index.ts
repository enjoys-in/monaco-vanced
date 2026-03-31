// ── API Stability Module ───────────────────────────────────

import type { MonacoPlugin, PluginContext } from "@core/types";
import type {
  APIStabilityConfig,
  APIStabilityModuleAPI,
  APIVersion,
  DeprecationEntry,
  Shim,
} from "./types";
import { DeprecationRegistry } from "./deprecation";
import { VersionManager } from "./versioning";
import { ShimLayer } from "./shims";
import { ApiStabilityEvents } from "@core/events";

export type { APIStabilityConfig, APIStabilityModuleAPI, APIVersion, DeprecationEntry, Shim };
export { DeprecationRegistry, VersionManager, ShimLayer };

export function createAPIStabilityPlugin(
  config: APIStabilityConfig = {},
): { plugin: MonacoPlugin; api: APIStabilityModuleAPI } {
  const deprecations = new DeprecationRegistry();
  const versions = new VersionManager(config.currentVersion);
  const shims = new ShimLayer();

  let ctx: PluginContext | null = null;

  const api: APIStabilityModuleAPI = {
    deprecate(entry: DeprecationEntry): void {
      deprecations.register(entry);
      ctx?.emit(ApiStabilityEvents.DeprecatedAccess, { api: entry.api, since: entry.since });
    },

    getDeprecations(): DeprecationEntry[] {
      return deprecations.getAll();
    },

    getVersion(): APIVersion {
      return versions.get();
    },

    setVersion(v: APIVersion): void {
      const prev = versions.toString();
      versions.set(v);
      ctx?.emit(ApiStabilityEvents.VersionChange, { from: prev, to: versions.toString() });
    },

    createShim(shim: Shim): void {
      shims.register(shim);
    },

    removeShim(apiName: string): void {
      shims.remove(apiName);
    },
  };

  const plugin: MonacoPlugin = {
    id: "api-stability-module",
    name: "API Stability Module",
    version: "1.0.0",
    description: "Deprecation tracking, API versioning, and backward-compatibility shims",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;

      if (config.warnOnDeprecated !== false) {
        ctx.addDisposable(
          ctx.on(ApiStabilityEvents.DeprecatedAccess, (data?: unknown) => {
            const d = data as { api: string } | undefined;
            if (d?.api) {
              deprecations.check(d.api);
            }
          }),
        );
      }
    },

    onDispose(): void {
      ctx = null;
    },
  };

  return { plugin, api };
}
