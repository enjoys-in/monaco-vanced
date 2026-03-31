// ── Workspace Module — Plugin Entry ───────────────────────────
// Multi-root workspace management with root registry, config, scope, trust.
// Events: workspace:root-added/removed/changed, workspace:config-changed

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type {
  WorkspacePluginOptions,
  WorkspaceModuleAPI,
  WorkspaceConfig,
} from "./types";
import { WorkspaceEvents } from "./types";
import { RootRegistry } from "./roots";
import { parseWorkspaceConfig } from "./config";
import { ScopeManager } from "./scope";
import { TrustManager } from "./trust";

export type {
  WorkspacePluginOptions,
  WorkspaceModuleAPI,
  WorkspaceConfig,
  WorkspaceFolderConfig,
  WorkspaceRoot,
} from "./types";
export { WorkspaceEvents } from "./types";
export { RootRegistry } from "./roots";
export { parseWorkspaceConfig, serializeWorkspaceConfig } from "./config";
export { ScopeManager } from "./scope";
export { TrustManager } from "./trust";

/**
 * Create the workspace plugin — manages multi-root workspaces.
 */
export function createWorkspacePlugin(
  options: WorkspacePluginOptions = {},
): { plugin: MonacoPlugin; api: WorkspaceModuleAPI } {
  const registry = new RootRegistry();
  const scopes = new ScopeManager();
  const trust = new TrustManager(options.trustByDefault !== false);
  const disposables: IDisposable[] = [];

  let ctx: PluginContext | null = null;
  let config: WorkspaceConfig | null = null;

  const api: WorkspaceModuleAPI = {
    getRoots: () => registry.getAll(),

    addRoot(path: string, name?: string, adapter?) {
      if (registry.has(path)) return;
      const root = registry.add(path, name, adapter, trust.isTrusted(path));
      scopes.initScope(root);
      ctx?.emit(WorkspaceEvents.RootAdded, { path: root.path, name: root.name });
    },

    removeRoot(path: string) {
      const existed = registry.remove(path);
      if (existed) {
        scopes.removeScope(path);
        trust.remove(path);
        ctx?.emit(WorkspaceEvents.RootRemoved, { path });

        // Notify which root is now active
        const active = registry.getActive();
        if (active) {
          ctx?.emit(WorkspaceEvents.RootChanged, { path: active.path, activeRoot: active.path });
        }
      }
    },

    getActiveRoot: () => registry.getActive(),

    setActiveRoot(path: string) {
      if (registry.setActive(path)) {
        ctx?.emit(WorkspaceEvents.RootChanged, { path, activeRoot: path });
      }
    },

    getConfig: () => config,

    isTrusted: (path: string) => trust.isTrusted(path),

    setTrusted(path: string, trusted: boolean) {
      trust.setTrusted(path, trusted);
      const root = registry.get(path);
      if (root) {
        (root as { trusted: boolean }).trusted = trusted;
      }
    },
  };

  const plugin: MonacoPlugin = {
    id: "workspace-module",
    name: "Workspace Manager",
    version: "1.0.0",
    description: "Multi-root workspace management — roots, config, scope, trust",
    dependencies: ["fs-module"],

    async onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      // Load initial roots from options
      if (options.roots) {
        for (const root of options.roots) {
          registry.add(root.path, root.name, root.adapter, root.trusted);
          scopes.initScope(root);
        }
      }

      // Try to load workspace config if a configPath was provided
      if (options.configPath) {
        disposables.push(
          ctx.on("file:read", (data) => {
            const { path, data: content } = data as { path: string; data: Uint8Array };
            if (path === options.configPath) {
              const text = new TextDecoder().decode(content);
              const parsed = parseWorkspaceConfig(text);
              if (parsed) {
                config = parsed;
                // Add roots from config that aren't already registered
                for (const folder of parsed.folders) {
                  if (!registry.has(folder.path)) {
                    api.addRoot(folder.path, folder.name);
                  }
                }
                // Apply workspace settings
                if (parsed.settings) {
                  scopes.setGlobalSettings(parsed.settings);
                }
                ctx!.emit(WorkspaceEvents.ConfigChanged, { config: parsed });
              }
            }
          }),
        );

        // Request the config file
        ctx.emit("file:read-request", { path: options.configPath });
      }
    },

    onDispose() {
      for (const d of disposables) d.dispose();
      disposables.length = 0;
      registry.clear();
      scopes.clear();
      trust.clear();
      config = null;
      ctx = null;
    },
  };

  return { plugin, api };
}
