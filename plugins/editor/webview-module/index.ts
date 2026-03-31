// ── Webview Module ──────────────────────────────────────────
// Plugin that adds the full webview system to the IDE:
// createWebview(), registerWebview(), iframe sandboxing,
// message bridge, EngineApi, and loading indicators.

import type { MonacoPlugin, PluginContext } from "@core/types";
import { WebviewEvents } from "@core/events";
import { WebviewManager } from "./manager";
import type { WebviewModuleAPI, WebviewPanelOptions } from "./types";
import { WebviewPanelImpl } from "./panel";
import { createIframeHost, createLoadingElement } from "./iframe-host";

export type { WebviewModuleAPI } from "./types";
export type { WebviewPanel } from "./types";
export type { WebviewPanelOptions } from "./types";
export type { WebviewDescriptor } from "./types";
export type { WebviewLoadingConfig } from "./types";
export type { WebviewMessage } from "./types";
export type { WebviewPermission } from "./types";
export type { EngineApi } from "./types";

export function createWebviewPlugin(): {
  plugin: MonacoPlugin;
  api: WebviewModuleAPI;
} {
  const manager = new WebviewManager();

  /** Map of panel ID → iframe host handle */
  const iframeHosts = new Map<
    string,
    ReturnType<typeof createIframeHost>
  >();

  let ctx: PluginContext | null = null;

  const api: WebviewModuleAPI = {
    createWebview(options: WebviewPanelOptions) {
      return manager.createWebview(options);
    },
    registerWebview(descriptor) {
      return manager.registerWebview(descriptor);
    },
    getWebview(id) {
      return manager.getWebview(id);
    },
    getWebviews() {
      return manager.getWebviews();
    },
    hasWebview(id) {
      return manager.hasWebview(id);
    },
  };

  const plugin: MonacoPlugin = {
    id: "webview-module",
    name: "Webview Module",
    version: "1.0.0",
    description:
      "Sandboxed webview panels with EngineApi, message bridge, loading indicators, and lazy registration",
    dependencies: ["layout-module"],

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;
      manager.setContext(ctx);

      // Listen for webview:create to mount the iframe in layout
      ctx.addDisposable(
        ctx.on(WebviewEvents.Create, (data) => {
          const { id, location } = data as {
            id: string;
            location: string;
          };
          const panel = manager.getWebview(id) as WebviewPanelImpl | null;
          if (!panel || !ctx) return;

          const options = panel.options;

          // Only create iframe for html-mode panels
          if (options.html) {
            const host = createIframeHost(panel, options, ctx);
            iframeHosts.set(id, host);

            // Emit to layout system for placement
            ctx.emit("layout:webview-mount", {
              id,
              location,
              container: host.container,
              title: panel.title,
              icon: options.icon,
            });
          } else if (options.render) {
            // React-mode: emit render request to layout
            ctx.emit("layout:webview-mount", {
              id,
              location,
              render: options.render,
              title: panel.title,
              icon: options.icon,
            });
          }
        }),
      );

      // Listen for show/hide to update iframe visibility
      ctx.addDisposable(
        ctx.on(WebviewEvents.Show, (data) => {
          const { id } = data as { id: string };
          const host = iframeHosts.get(id);
          if (host) host.container.style.display = "block";
          ctx?.emit("layout:webview-show", { id });
        }),
      );

      ctx.addDisposable(
        ctx.on(WebviewEvents.Hide, (data) => {
          const { id } = data as { id: string };
          const panel = manager.getWebview(id) as WebviewPanelImpl | null;
          const host = iframeHosts.get(id);
          if (host) {
            if (panel?.options.retainOnHidden) {
              host.container.style.display = "none";
            } else {
              // Save state, remove iframe
              ctx?.emit(WebviewEvents.StateSave, { id });
              host.destroy();
              iframeHosts.delete(id);
            }
          }
          ctx?.emit("layout:webview-hide", { id });
        }),
      );

      // Listen for dispose to clean up iframe
      ctx.addDisposable(
        ctx.on(WebviewEvents.Dispose, (data) => {
          const { id } = data as { id: string };
          const host = iframeHosts.get(id);
          if (host) {
            host.destroy();
            iframeHosts.delete(id);
          }
          ctx?.emit("layout:webview-unmount", { id });
        }),
      );

      // Listen for loader start/done to show/hide loading indicators
      ctx.addDisposable(
        ctx.on(WebviewEvents.LoaderStart, (data) => {
          const { id } = data as { id: string };
          const host = iframeHosts.get(id);
          if (!host) return;
          const panel = manager.getWebview(id) as WebviewPanelImpl | null;
          const loadingEl = createLoadingElement(
            panel?.options.loading ?? {},
          );
          loadingEl.dataset.loadingFor = id;
          host.container.prepend(loadingEl);
        }),
      );

      ctx.addDisposable(
        ctx.on(WebviewEvents.LoaderDone, (data) => {
          const { id } = data as { id: string };
          const host = iframeHosts.get(id);
          if (!host) return;
          const loadingEl = host.container.querySelector(
            `[data-loading-for="${id}"]`,
          );
          if (loadingEl) loadingEl.remove();

          // Push updated loader data to the iframe
          const panel = manager.getWebview(id) as WebviewPanelImpl | null;
          if (panel) {
            host.bridge.postToWebview({
              type: "__loader-data",
              data: panel.loaderData,
            });
          }
        }),
      );

      // Post message forwarding (host → iframe)
      ctx.addDisposable(
        ctx.on(WebviewEvents.Post, (data) => {
          const { id, message } = data as {
            id: string;
            message: unknown;
          };
          const host = iframeHosts.get(id);
          if (host) {
            host.bridge.postToWebview(
              message as { type: string; [key: string]: unknown },
            );
          }
        }),
      );
    },

    onDispose(): void {
      for (const host of iframeHosts.values()) {
        host.destroy();
      }
      iframeHosts.clear();
      manager.disposeAll();
    },
  };

  return { plugin, api };
}
