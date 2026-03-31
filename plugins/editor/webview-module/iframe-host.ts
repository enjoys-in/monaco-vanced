// ── Iframe Host ─────────────────────────────────────────────
// Creates sandboxed iframes for webview panels, injects the
// EngineApi bootstrap, applies CSP, and manages loading states.

import type { PluginContext } from "@core/types";
import type {
  WebviewPanelOptions,
  WebviewTheme,
  WebviewLoadingConfig,
} from "./types";
import { WebviewPanelImpl } from "./panel";
import { HostBridge } from "./bridge";
import { buildEngineApiScript } from "./engine-api";
import { renderLoadingHTML } from "./loading";

export interface IframeHostHandle {
  readonly iframe: HTMLIFrameElement;
  readonly bridge: HostBridge;
  readonly container: HTMLElement;
  destroy(): void;
}

/**
 * Creates a sandboxed iframe for a webview panel, wires up
 * the message bridge, and registers RPC handlers.
 */
export function createIframeHost(
  panel: WebviewPanelImpl,
  options: WebviewPanelOptions,
  ctx: PluginContext,
): IframeHostHandle {
  const bridge = new HostBridge(panel.id);

  // Create the container
  const container = document.createElement("div");
  container.dataset.webviewId = panel.id;
  container.style.cssText = "position:relative;width:100%;height:100%;overflow:hidden;";

  // Create iframe
  const iframe = document.createElement("iframe");
  iframe.sandbox.add("allow-scripts");
  iframe.style.cssText = "width:100%;height:100%;border:none;";
  iframe.setAttribute("title", panel.title);

  // Build HTML content with injected EngineApi bootstrap
  const theme: WebviewTheme = {
    kind: "dark",
    colors: {},
  };

  const engineScript = buildEngineApiScript(
    panel.id,
    panel.initialData,
    panel.loaderData,
    theme,
  );

  const userHTML = options.html ?? "<html><body></body></html>";
  // Inject the engine script before </head> or at the start of <body>
  const injectedHTML = injectScript(userHTML, engineScript);

  // Apply CSP via meta tag
  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">`;
  const finalHTML = injectedHTML.replace(/<head>/i, `<head>${cspMeta}`)
    || `<html><head>${cspMeta}</head><body>${engineScript}${userHTML}</body></html>`;

  // Set iframe content via srcdoc
  iframe.srcdoc = finalHTML;

  // Bridge RPC handlers
  registerRPCHandlers(bridge, panel, ctx);

  // Wire bridge to iframe
  iframe.addEventListener("load", () => {
    bridge.attach(iframe);
  });

  // Wire notifications from iframe
  bridge.onMessage((msg) => {
    if (msg.type === "__notification") {
      ctx.notify(
        msg.message as string,
        (msg.level as "info" | "warning" | "error") ?? "info",
      );
      return;
    }
    if (msg.type === "__dispose") {
      panel.dispose();
      return;
    }
    if (msg.type === "__loading-show" || msg.type === "__loading-hide") {
      return; // Host-side loading control — handled by UI
    }
    // Forward to panel message handlers
    panel._receiveMessage(msg);
  });

  container.appendChild(iframe);

  return {
    iframe,
    bridge,
    container,
    destroy() {
      bridge.dispose();
      iframe.remove();
      container.remove();
    },
  };
}

/**
 * Builds a loading indicator container element.
 */
export function createLoadingElement(
  config: WebviewLoadingConfig = {},
): HTMLElement {
  const el = document.createElement("div");
  el.className = "webview-loading";
  el.style.cssText =
    "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:10;background:var(--vscode-editor-background,#1e1e1e);";
  el.innerHTML = renderLoadingHTML(config);
  return el;
}

// ── Helpers ──────────────────────────────────────────────────

function injectScript(html: string, script: string): string {
  // Try to inject before </head>
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${script}</head>`);
  }
  // Try to inject after <body>
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body([^>]*)>/i, `<body$1>${script}`);
  }
  // Wrap in full HTML
  return `<html><head></head><body>${script}${html}</body></html>`;
}

function registerRPCHandlers(
  bridge: HostBridge,
  panel: WebviewPanelImpl,
  ctx: PluginContext,
): void {
  // State persistence using localStorage scoped to panel ID
  const stateKey = `webview-state:${panel.id}`;

  bridge.registerRPC("getState", async () => {
    const raw = localStorage.getItem(stateKey);
    return raw ? JSON.parse(raw) : {};
  });

  bridge.registerRPC("setState", async (args) => {
    const [state] = args;
    localStorage.setItem(stateKey, JSON.stringify(state));
  });

  bridge.registerRPC("executeCommand", async (args) => {
    const [commandId] = args as [string];
    // Delegate to editor action trigger
    ctx.editor.trigger("webview", commandId, undefined);
    return undefined;
  });

  bridge.registerRPC("getActiveFile", async () => {
    const model = ctx.editor.getModel();
    if (!model) return null;
    return {
      uri: model.uri.toString(),
      language: model.getLanguageId(),
    };
  });

  bridge.registerRPC("getSelection", async () => {
    const selection = ctx.editor.getSelection();
    if (!selection) return null;
    const model = ctx.editor.getModel();
    const text = model?.getValueInRange(selection) ?? "";
    return {
      text,
      range: {
        startLineNumber: selection.startLineNumber,
        startColumn: selection.startColumn,
        endLineNumber: selection.endLineNumber,
        endColumn: selection.endColumn,
      },
    };
  });

  bridge.registerRPC("getOpenFiles", async () => {
    // Return current model as the only open file
    const model = ctx.editor.getModel();
    if (!model) return [];
    return [{
      uri: model.uri.toString(),
      label: model.uri.path.split("/").pop() ?? model.uri.toString(),
      isDirty: false,
    }];
  });

  bridge.registerRPC("readFile", async (args) => {
    // Proxy through event bus — fs-module listens
    const [path] = args as [string];
    ctx.emit("webview:fs-read", { path, panelId: panel.id });
    return ""; // Actual impl requires async FS adapter
  });

  bridge.registerRPC("writeFile", async (args) => {
    const [path, content] = args as [string, string];
    ctx.emit("webview:fs-write", { path, content, panelId: panel.id });
  });

  bridge.registerRPC("listDir", async (args) => {
    const [dir] = args as [string];
    ctx.emit("webview:fs-list", { dir, panelId: panel.id });
    return [];
  });

  bridge.registerRPC("getSetting", async (args) => {
    const [key] = args as [string];
    ctx.emit("webview:setting-read", { key, panelId: panel.id });
    return undefined;
  });

  bridge.registerRPC("setSetting", async (args) => {
    const [key, value] = args as [string, unknown];
    ctx.emit("webview:setting-write", { key, value, panelId: panel.id });
  });

  bridge.registerRPC("submitAction", async (args) => {
    const [actionData] = args;
    const options = panel.options;
    if (!options.action) return undefined;
    return options.action(ctx, actionData);
  });
}
