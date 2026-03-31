// ── LSP Bridge Module — Plugin Entry Point ────────────────────
// See context/lsp-bridge-module.txt Section 13
//
// Tri-mode LSP client:
//   V1 (Custom): direct WebSocket + manual JSON-RPC.
//   V2 (Built-in): full LSP lifecycle with 24 typed Monaco providers.
//   V3 (Native): monaco.lsp.WebSocketTransport + MonacoLspClient (auto providers).

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { LspBridgePluginOptions, LspConnectionConfig, LspMode } from "./types";
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

  let mode = (options.mode ?? "builtin") as LspMode;

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

// ── Exports ───────────────────────────────────────────────────

export type {
  LspConnectionConfig,
  LspConnectionState,
  LspMode,
  LspConnection,
  LspProviderRegistration,
  LspClient,
  LspBridgePluginOptions,
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
