// ── Embed Module — Plugin Entry ──────────────────────────────

import type { MonacoPlugin, PluginContext } from "@core/types";
import { EmbedEvents } from "@core/events";
import type { EmbedConfig, EmbedMessage, EmbedModuleAPI } from "./types";
import { MessageBridge } from "./message-handler";
import { EmbedAPI } from "./api";

export type { EmbedConfig, EmbedMessage, EmbedModuleAPI } from "./types";
export { MessageBridge } from "./message-handler";
export { EmbedAPI } from "./api";

export function createEmbedPlugin(_config: EmbedConfig = { containerId: "editor" }): {
  plugin: MonacoPlugin;
  api: EmbedModuleAPI;
} {
  const bridge = new MessageBridge();
  const embedApi = new EmbedAPI(bridge);
  let ctx: PluginContext | null = null;
  const messageHandlers: Array<(msg: EmbedMessage) => void> = [];

  const api: EmbedModuleAPI = {
    mount(containerId: string, options?: Record<string, unknown>) {
      if (ctx) {
        ctx.emit(EmbedEvents.Mount, { containerId, options });
      }
    },
    unmount() {
      if (ctx) {
        ctx.emit(EmbedEvents.Unmount, {});
      }
    },
    sendMessage(msg: EmbedMessage) {
      const target = isEmbeddedCheck() ? window.parent : null;
      if (target) {
        bridge.postMessage(target, msg);
      }
    },
    onMessage(handler: (msg: EmbedMessage) => void) {
      messageHandlers.push(handler);
      bridge.onMessage(handler);
    },
    isEmbedded: isEmbeddedCheck,
  };

  function isEmbeddedCheck(): boolean {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }

  const plugin: MonacoPlugin = {
    id: "embed-module",
    name: "Embed Module",
    version: "1.0.0",
    description: "Embed Monaco editor in iframes with postMessage communication",

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;
      embedApi.bind(ctx);
      bridge.start();

      // Forward content changes through the bridge
      bridge.onMessage((msg) => {
        if (msg.type === "setValue") {
          embedApi.setValue(msg.payload as string);
        } else if (msg.type === "getValue") {
          embedApi.sendToHost("value", embedApi.getValue());
        } else if (msg.type === "setLanguage") {
          embedApi.setLanguage(msg.payload as string);
        } else if (msg.type === "setTheme") {
          embedApi.setTheme(msg.payload as string);
        }
      });

      ctx.emit(EmbedEvents.Ready, { embedded: isEmbeddedCheck() });
    },

    onContentChange(content: string) {
      embedApi.notifyChange(content);
      if (isEmbeddedCheck() && window.parent) {
        bridge.postMessage(window.parent, {
          type: "contentChange",
          payload: content,
          source: "monaco-vanced",
        });
      }
    },

    onDispose() {
      bridge.stop();
      embedApi.dispose();
      ctx = null;
    },
  };

  return { plugin, api };
}
