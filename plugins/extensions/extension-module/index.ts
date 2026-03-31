// ── Extension Module — Plugin Entry ──────────────────────────

import type { MonacoPlugin, PluginContext } from "@core/types";
import { ExtensionEvents } from "@core/events";
import type {
  ExtensionConfig,
  ExtensionManifest,
  Extension,
  ExtensionModuleAPI,
} from "./types";
import { validateManifest } from "./manifest-validator";
import { ExtensionLifecycle } from "./lifecycle";

export type { ExtensionConfig, ExtensionManifest, Extension, ExtensionState, ExtensionModuleAPI } from "./types";
export { validateManifest } from "./manifest-validator";
export { ExtensionSandbox } from "./sandbox";
export { IframeSandbox } from "./iframe-sandbox";
export type { IframeSandboxConfig } from "./iframe-sandbox";
export { RPCBridge } from "./rpc-bridge";
export { ExtensionLifecycle } from "./lifecycle";
export { CapabilityChecker } from "./capability";
export { ExtensionUpdater } from "./updater";
export type { UpdateInfo } from "./updater";
export { ExtensionMigrator } from "./migrator";
export type { MigrationStep } from "./migrator";

export function createExtensionPlugin(config: ExtensionConfig = {}): {
  plugin: MonacoPlugin;
  api: ExtensionModuleAPI;
} {
  const extensions = new Map<string, Extension>();
  const lifecycle = new ExtensionLifecycle();
  let ctx: PluginContext | null = null;

  const api: ExtensionModuleAPI = {
    async install(manifest: ExtensionManifest, code?: string) {
      const validation = validateManifest(manifest);
      if (!validation.valid) {
        throw new Error(`Invalid manifest: ${validation.errors.join(", ")}`);
      }

      if (config.maxExtensions && extensions.size >= config.maxExtensions) {
        throw new Error(`Maximum extensions limit reached (${config.maxExtensions})`);
      }

      const ext: Extension = {
        manifest,
        state: "installed",
        lastUpdated: Date.now(),
      };
      extensions.set(manifest.id, ext);

      await lifecycle.activate(ext, code);
      ctx?.emit(ExtensionEvents.Installed, { id: manifest.id });
    },

    async uninstall(extensionId: string) {
      const ext = extensions.get(extensionId);
      if (!ext) throw new Error(`Extension "${extensionId}" not found`);

      await lifecycle.deactivate(ext);
      extensions.delete(extensionId);
      ctx?.emit(ExtensionEvents.Uninstalled, { id: extensionId });
    },

    enable(extensionId: string) {
      const ext = extensions.get(extensionId);
      if (!ext) throw new Error(`Extension "${extensionId}" not found`);
      ext.state = "enabled";
      ctx?.emit(ExtensionEvents.Enabled, { id: extensionId });
    },

    disable(extensionId: string) {
      const ext = extensions.get(extensionId);
      if (!ext) throw new Error(`Extension "${extensionId}" not found`);
      ext.state = "disabled";
      ctx?.emit(ExtensionEvents.Disabled, { id: extensionId });
    },

    getAll() {
      return Array.from(extensions.values());
    },

    getExtension(extensionId: string) {
      return extensions.get(extensionId);
    },

    async reload(extensionId: string) {
      const ext = extensions.get(extensionId);
      if (!ext) throw new Error(`Extension "${extensionId}" not found`);

      await lifecycle.deactivate(ext);
      await lifecycle.activate(ext);
      ctx?.emit(ExtensionEvents.Reloaded, { id: extensionId });
    },
  };

  const plugin: MonacoPlugin = {
    id: "extension-module",
    name: "Extension Module",
    version: "1.0.0",
    description: "Extension management with sandboxed execution",

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;
      ctx.emit(ExtensionEvents.Ready, {});
    },

    onDispose() {
      for (const ext of extensions.values()) {
        lifecycle.deactivate(ext).catch(() => {});
      }
      extensions.clear();
      lifecycle.dispose();
      ctx = null;
    },
  };

  return { plugin, api };
}
