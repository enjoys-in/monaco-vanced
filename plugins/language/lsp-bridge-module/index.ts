// ── LSP Bridge Module — Plugin Entry Point ────────────────────
// See context/lsp-bridge-module.txt Section 13
//
// Tri-mode LSP client:
//   V1 (Custom): direct WebSocket + manual JSON-RPC.
//   V2 (Built-in): full LSP lifecycle with 24 typed Monaco providers.
//   V3 (Native): monaco.lsp.WebSocketTransport + MonacoLspClient (auto providers).

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { LspBridgePluginOptions, LspConnectionConfig, LspMode, LspConnectorApi } from "./types";
import { DEFAULT_LSP_CONFIG } from "./types";
import { CustomLspClient } from "./clients/v1-custom";
import { BuiltinLspClient } from "./clients/v2-builtin";
import { NativeLspClient } from "./clients/v3-native";
import { LspProviderBridge } from "./providers/bridge";
import { hasLSPSupport } from "./languages";
import { LspEvents, EditorEvents } from "@core/events";

export function createLspBridgePlugin(
  options: LspBridgePluginOptions = {},
): MonacoPlugin {
  const disposables: IDisposable[] = [];
  let customClient: CustomLspClient | null = null;
  let builtinClient: BuiltinLspClient | null = null;
  let nativeClient: NativeLspClient | null = null;
  let bridge: LspProviderBridge | null = null;

  const config: LspConnectionConfig = {
    url: options.url ?? DEFAULT_LSP_CONFIG.url,
    retryIntervalMs: options.retryIntervalMs ?? DEFAULT_LSP_CONFIG.retryIntervalMs,
    maxRetries: options.maxRetries ?? DEFAULT_LSP_CONFIG.maxRetries,
    timeoutMs: options.timeoutMs ?? DEFAULT_LSP_CONFIG.timeoutMs,
    rootUri: options.rootUri ?? DEFAULT_LSP_CONFIG.rootUri,
    pingEnabled: options.pingEnabled ?? DEFAULT_LSP_CONFIG.pingEnabled,
    pingIntervalMs: options.pingIntervalMs ?? DEFAULT_LSP_CONFIG.pingIntervalMs,
  };

  let mode = (options.mode ?? "native") as LspMode;

  return {
    id: "lsp-bridge-module",
    name: "LSP Bridge",
    version: "3.0.0",
    description:
      "Tri-mode LSP client — V1 custom JSON-RPC, V2 full LSP lifecycle (24 providers), V3 native monaco.lsp auto-client",
    dependencies: ["editor-module"],
    priority: 50,
    defaultEnabled: options.enabled ?? true,

    onMount(ctx: PluginContext) {
      const { monaco, editor } = ctx;

      // ── Create clients based on mode ────────────────────

      function createClients(): void {
        if (mode === "custom" || (mode as string) === "both") {
          customClient = new CustomLspClient(
            // Access the event bus through ctx.emit/on pattern
            { emit: ctx.emit.bind(ctx), on: ctx.on.bind(ctx) } as import("@core/event-bus").EventBus,
            config,
          );
          bridge = new LspProviderBridge(customClient, monaco);
        }
        if (mode === "builtin" || (mode as string) === "both") {
          builtinClient = new BuiltinLspClient(
            { emit: ctx.emit.bind(ctx), on: ctx.on.bind(ctx) } as import("@core/event-bus").EventBus,
            config,
            monaco,
            editor,
          );
        }
        if (mode === "native") {
          nativeClient = new NativeLspClient(
            { emit: ctx.emit.bind(ctx), on: ctx.on.bind(ctx) } as import("@core/event-bus").EventBus,
            config,
            monaco,
            editor,
          );
        }
      }

      createClients();

      // ── V1: Auto-connect on startup ─────────────────────

      if (options.autoConnect !== false && customClient) {
        customClient.connect().catch((err) => {
          console.warn("[lsp-bridge] V1 custom client connect failed:", err);
        });
      }

      // ── V2: Auto-connect per language ───────────────────

      if (builtinClient) {
        const connectForLanguage = (langId: string) => {
          if (hasLSPSupport(langId) && builtinClient) {
            builtinClient.connect(langId).catch((err) => {
              console.warn(`[lsp-bridge] V2 connect failed for ${langId}:`, err);
            });
          }
        };

        // Connect for current model on mount
        if (options.autoConnect !== false) {
          const currentModel = editor.getModel();
          if (currentModel) {
            connectForLanguage(currentModel.getLanguageId());
          }
        }

        // Connect when model changes (file switch)
        const modelDisposable = editor.onDidChangeModel((e) => {
          if (e.newModelUrl) {
            const model = monaco.editor.getModel(e.newModelUrl);
            if (model) connectForLanguage(model.getLanguageId());
          }
        });
        disposables.push(modelDisposable);

        // Connect when language changes
        disposables.push(
          ctx.on(EditorEvents.LanguageChange, (payload) => {
            const { languageId } = payload as { languageId: string };
            connectForLanguage(languageId);
          }),
        );
      }

      // ── V3 (Native): Auto-connect per language ─────────────

      if (nativeClient) {
        const connectNative = (langId: string) => {
          if (hasLSPSupport(langId) && nativeClient) {
            nativeClient.connect(langId).catch((err) => {
              console.warn(`[lsp-bridge] V3 native connect failed for ${langId}:`, err);
            });
          }
        };

        if (options.autoConnect !== false) {
          const currentModel = editor.getModel();
          if (currentModel) {
            connectNative(currentModel.getLanguageId());
          }
        }

        const nativeModelDisposable = editor.onDidChangeModel((e) => {
          if (e.newModelUrl) {
            const model = monaco.editor.getModel(e.newModelUrl);
            if (model) connectNative(model.getLanguageId());
          }
        });
        disposables.push(nativeModelDisposable);

        disposables.push(
          ctx.on(EditorEvents.LanguageChange, (payload) => {
            const { languageId } = payload as { languageId: string };
            connectNative(languageId);
          }),
        );
      }

      // ── Mode change handling ────────────────────────────

      disposables.push(
        ctx.on(LspEvents.ModeChanged, (payload) => {
          const { newMode } = payload as { newMode: LspMode };

          // Dispose current clients
          customClient?.dispose();
          builtinClient?.dispose();
          nativeClient?.dispose();
          bridge?.dispose();
          customClient = null;
          builtinClient = null;
          nativeClient = null;
          bridge = null;

          mode = newMode;
          createClients();

          // Auto-connect new clients (re-read from closure after createClients)
          const cc = customClient as CustomLspClient | null;
          const bc = builtinClient as BuiltinLspClient | null;
          const nc = nativeClient as NativeLspClient | null;
          if (options.autoConnect !== false) {
            if (cc) cc.connect().catch(() => {});
            const currentModel = editor.getModel();
            if (currentModel && bc) {
              bc.connect(currentModel.getLanguageId()).catch(() => {});
            }
            if (currentModel && nc) {
              nc.connect(currentModel.getLanguageId()).catch(() => {});
            }
          }
        }),
      );

      // ── URL change handling ─────────────────────────────

      disposables.push(
        ctx.on(LspEvents.UrlChanged, (payload) => {
          const { url } = payload as { url: string };
          config.url = url;

          // Reconnect with new URL
          if (customClient) customClient.disconnect();
          if (builtinClient) builtinClient.disconnect();
          if (nativeClient) nativeClient.disconnect();

          if (options.autoConnect !== false) {
            if (customClient) customClient.connect().catch(() => {});
            const currentModel = editor.getModel();
            if (currentModel && builtinClient) {
              builtinClient.connect(currentModel.getLanguageId()).catch(() => {});
            }
            if (currentModel && nativeClient) {
              nativeClient.connect(currentModel.getLanguageId()).catch(() => {});
            }
          }
        }),
      );
    },

    onDispose() {
      customClient?.dispose();
      builtinClient?.dispose();
      nativeClient?.dispose();
      bridge?.dispose();
      customClient = null;
      builtinClient = null;
      nativeClient = null;
      bridge = null;

      for (const d of disposables) d.dispose();
      disposables.length = 0;
    },
  };
}

// ── Connector Plugin — full raw API for consumers ─────────────

/**
 * Creates an LSP connector plugin that exposes the full LSP API to the consumer.
 * Unlike `createLspBridgePlugin` (which is opinionated), the connector gives you
 * raw access to the client, event bus, and editor — you handle everything yourself.
 *
 * @example
 * ```ts
 * const { plugin, api } = createLspConnectorPlugin({ url: "wss://my-lsp.dev" });
 * engine.register(plugin);
 *
 * // Later — use the api directly
 * await api.connect("typescript");
 * const result = await api.request("textDocument/completion", params);
 * api.on(LspEvents.Diagnostics, (d) => console.log(d));
 * api.notify("textDocument/didSave", { textDocument: { uri } });
 * ```
 */
export function createLspConnectorPlugin(
  options: LspBridgePluginOptions = {},
): { plugin: MonacoPlugin; api: LspConnectorApi } {
  const disposables: IDisposable[] = [];
  let activeClient: CustomLspClient | BuiltinLspClient | NativeLspClient | null = null;
  let bridge: LspProviderBridge | null = null;
  let ctx: PluginContext | null = null;

  const config: LspConnectionConfig = {
    url: options.url ?? DEFAULT_LSP_CONFIG.url,
    retryIntervalMs: options.retryIntervalMs ?? DEFAULT_LSP_CONFIG.retryIntervalMs,
    maxRetries: options.maxRetries ?? DEFAULT_LSP_CONFIG.maxRetries,
    timeoutMs: options.timeoutMs ?? DEFAULT_LSP_CONFIG.timeoutMs,
    rootUri: options.rootUri ?? DEFAULT_LSP_CONFIG.rootUri,
    pingEnabled: options.pingEnabled ?? DEFAULT_LSP_CONFIG.pingEnabled,
    pingIntervalMs: options.pingIntervalMs ?? DEFAULT_LSP_CONFIG.pingIntervalMs,
  };

  let mode: LspMode = options.mode ?? "native";

  function createClient(): void {
    if (!ctx) return;
    const { monaco, editor } = ctx;
    const eventBus = { emit: ctx.emit.bind(ctx), on: ctx.on.bind(ctx) } as import("@core/event-bus").EventBus;

    activeClient?.dispose();
    bridge?.dispose();
    activeClient = null;
    bridge = null;

    switch (mode) {
      case "custom": {
        const client = new CustomLspClient(eventBus, config);
        bridge = new LspProviderBridge(client, monaco);
        activeClient = client;
        break;
      }
      case "builtin":
        activeClient = new BuiltinLspClient(eventBus, config, monaco, editor);
        break;
      case "native":
        activeClient = new NativeLspClient(eventBus, config, monaco, editor);
        break;
    }
  }

  // ── Build the API object (stable reference, delegates to live state) ──

  const api: LspConnectorApi = {
    get client() { return activeClient; },
    get config() { return config; },
    get mode() { return mode; },

    async connect(languageId?: string) {
      if (!activeClient) throw new Error("[lsp-connector] No client — plugin not mounted yet");
      const langId = languageId ?? ctx?.editor.getModel()?.getLanguageId() ?? "typescript";
      if (!hasLSPSupport(langId)) throw new Error(`[lsp-connector] Unsupported language: ${langId}`);
      await activeClient.connect(langId);
    },

    disconnect() {
      activeClient?.disconnect();
    },

    switchMode(newMode: LspMode) {
      mode = newMode;
      createClient();
    },

    changeUrl(url: string, reconnect = true) {
      config.url = url;
      if (reconnect && activeClient) {
        activeClient.disconnect();
        const langId = api.getCurrentLanguageId() ?? ctx?.editor.getModel()?.getLanguageId();
        if (langId) activeClient.connect(langId).catch(() => {});
      }
    },

    request<T = unknown>(method: string, params?: unknown): Promise<T> {
      if (!activeClient) return Promise.reject(new Error("[lsp-connector] No client"));
      return activeClient.request<T>(method, params);
    },

    notify(method: string, params?: unknown) {
      activeClient?.notify(method, params);
    },

    emit(event: string, data?: unknown) {
      ctx?.emit(event, data);
    },

    on(event: string, handler: (data?: unknown) => void): IDisposable {
      if (!ctx) return { dispose: () => {} };
      const d = ctx.on(event, handler);
      disposables.push(d);
      return d;
    },

    getState() {
      return activeClient?.getState() ?? "disconnected";
    },

    isConnected() {
      return activeClient?.isConnected() ?? false;
    },

    getCurrentLanguageId() {
      if (activeClient && "getCurrentLanguageId" in activeClient) {
        return (activeClient as BuiltinLspClient | NativeLspClient).getCurrentLanguageId();
      }
      return null;
    },

    hasLanguageSupport: hasLSPSupport,

    dispose() {
      activeClient?.dispose();
      bridge?.dispose();
      activeClient = null;
      bridge = null;
      for (const d of disposables) d.dispose();
      disposables.length = 0;
    },
  };

  // ── The plugin shell — minimal, just wires up lifecycle ───

  const plugin: MonacoPlugin = {
    id: "lsp-connector",
    name: "LSP Connector",
    version: "3.0.0",
    description:
      "Raw LSP connector — exposes full client API, event bus, and editor context for custom LSP workflows",
    dependencies: ["editor-module"],
    priority: 50,
    defaultEnabled: options.enabled ?? true,

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;
      createClient();

      // Auto-connect if enabled
      if (options.autoConnect !== false && activeClient) {
        const currentModel = pluginCtx.editor.getModel();
        const langId = currentModel?.getLanguageId() ?? "typescript";
        if (hasLSPSupport(langId)) {
          activeClient.connect(langId).catch((err) => {
            console.warn("[lsp-connector] Auto-connect failed:", err);
          });
        }
      }

      // Re-connect on model/language change
      const modelDisposable = pluginCtx.editor.onDidChangeModel((e) => {
        if (e.newModelUrl && activeClient && options.autoConnect !== false) {
          const model = pluginCtx.monaco.editor.getModel(e.newModelUrl);
          if (model && hasLSPSupport(model.getLanguageId())) {
            activeClient.connect(model.getLanguageId()).catch(() => {});
          }
        }
      });
      disposables.push(modelDisposable);

      disposables.push(
        pluginCtx.on(EditorEvents.LanguageChange, (payload) => {
          const { languageId } = payload as { languageId: string };
          if (activeClient && options.autoConnect !== false && hasLSPSupport(languageId)) {
            activeClient.connect(languageId).catch(() => {});
          }
        }),
      );
    },

    onDispose() {
      api.dispose();
      ctx = null;
    },
  };

  return { plugin, api };
}

// ── Exports ───────────────────────────────────────────────────

export type {
  LspConnectionConfig,
  LspConnectionState,
  LspMode,
  LspConnection,
  LspProviderRegistration,
  LspClient,
  LspBridgePluginOptions,
  LspConnectorApi,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcNotification,
  LspMessageType,
} from "./types";
export { DEFAULT_LSP_CONFIG } from "./types";
export { CustomLspClient } from "./clients/v1-custom";
export { BuiltinLspClient } from "./clients/v2-builtin";
export { NativeLspClient } from "./clients/v3-native";
export { LspProviderBridge } from "./providers/bridge";
export { LspConnectionManager } from "./connection";
export { hasLSPSupport, buildLSPWebSocketUrl, LSP_LANGUAGES } from "./languages";
export { LSP_METHODS } from "./protocol";
