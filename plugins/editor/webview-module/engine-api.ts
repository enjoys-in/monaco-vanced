// ── Engine API Bootstrap Script ─────────────────────────────
// Generates the JavaScript code that gets injected into the
// iframe. This script exposes `acquireEngineApi()` which
// returns the EngineApi proxy that communicates with the host
// via postMessage + RPC.

import type { WebviewTheme } from "./types";

/**
 * Builds the inline script that will run inside the sandboxed iframe.
 * It defines `acquireEngineApi()` which returns the EngineApi object.
 */
export function buildEngineApiScript(
  panelId: string,
  initialData: unknown,
  loaderData: unknown,
  theme: WebviewTheme,
): string {
  // Serialize data safely (handles undefined → null)
  const serialized = {
    panelId,
    initialData: initialData ?? null,
    loaderData: loaderData ?? null,
    theme,
  };

  return `
<script>
(function() {
  "use strict";

  var __panelId = ${JSON.stringify(serialized.panelId)};
  var __initialData = ${JSON.stringify(serialized.initialData)};
  var __loaderData = ${JSON.stringify(serialized.loaderData)};
  var __theme = ${JSON.stringify(serialized.theme)};
  var __requestId = 0;
  var __pendingRPC = {};
  var __messageHandlers = [];
  var __themeHandlers = [];
  var __loaderDataHandlers = [];
  var __loaderErrorHandlers = [];
  var __actionErrorHandlers = [];
  var __actionPending = false;
  var __actionCompleteHandlers = [];
  var __loading = false;

  // Listen for messages from host
  window.addEventListener("message", function(event) {
    var data = event.data;
    if (!data || typeof data !== "object") return;

    // Regular message from host
    if (data.channel === "monaco-webview" && data.panelId === __panelId && data.direction === "host-to-webview") {
      var payload = data.payload;

      // Internal control messages
      if (payload.type === "__loader-data") {
        __loaderData = payload.data;
        __loaderDataHandlers.forEach(function(h) { h(payload.data); });
        return;
      }
      if (payload.type === "__loader-error") {
        __loaderErrorHandlers.forEach(function(h) { h(payload.error); });
        return;
      }
      if (payload.type === "__action-error") {
        __actionPending = false;
        __actionErrorHandlers.forEach(function(h) { h(payload.error); });
        return;
      }
      if (payload.type === "__action-done") {
        __actionPending = false;
        __actionCompleteHandlers.forEach(function(h) { h(payload.result); });
        return;
      }
      if (payload.type === "__theme-change") {
        __theme = payload.theme;
        __themeHandlers.forEach(function(h) { h(payload.theme); });
        return;
      }
      if (payload.type === "__loading-show") { __loading = true; return; }
      if (payload.type === "__loading-hide") { __loading = false; return; }

      // User messages
      __messageHandlers.forEach(function(h) { h(payload); });
    }

    // RPC response from host
    if (data.channel === "monaco-webview-rpc-response" && data.panelId === __panelId) {
      var pending = __pendingRPC[data.requestId];
      if (pending) {
        delete __pendingRPC[data.requestId];
        if (data.error) pending.reject(new Error(data.error));
        else pending.resolve(data.result);
      }
    }
  });

  function rpc(method, args) {
    return new Promise(function(resolve, reject) {
      var id = "rpc-" + (++__requestId);
      __pendingRPC[id] = { resolve: resolve, reject: reject };
      window.parent.postMessage({
        channel: "monaco-webview-rpc",
        panelId: __panelId,
        requestId: id,
        method: method,
        args: args || []
      }, "*");
    });
  }

  function postToHost(msg) {
    window.parent.postMessage({
      channel: "monaco-webview",
      panelId: __panelId,
      direction: "webview-to-host",
      payload: msg
    }, "*");
  }

  var engineApi = {
    // Messaging
    postMessage: postToHost,
    onMessage: function(handler) { __messageHandlers.push(handler); },

    // Commands
    executeCommand: function(commandId) {
      var args = Array.prototype.slice.call(arguments, 1);
      return rpc("executeCommand", [commandId].concat(args));
    },

    // State
    getState: function() { return rpc("getState", []); },
    setState: function(state) { return rpc("setState", [state]); },

    // Theme
    get theme() { return __theme; },
    onThemeChange: function(handler) { __themeHandlers.push(handler); },

    // Editor info
    getActiveFile: function() { return rpc("getActiveFile", []); },
    getSelection: function() { return rpc("getSelection", []); },
    getOpenFiles: function() { return rpc("getOpenFiles", []); },

    // FS
    readFile: function(path) { return rpc("readFile", [path]); },
    writeFile: function(path, content) { return rpc("writeFile", [path, content]); },
    listDir: function(dir) { return rpc("listDir", [dir]); },

    // Settings
    getSetting: function(key) { return rpc("getSetting", [key]); },
    setSetting: function(key, value) { return rpc("setSetting", [key, value]); },

    // Notifications
    showNotification: function(msg, level) {
      postToHost({ type: "__notification", message: msg, level: level || "info" });
    },

    // Loader / Action data
    get initialData() { return __initialData; },
    get loaderData() { return __loaderData; },
    onLoaderData: function(handler) { __loaderDataHandlers.push(handler); },
    onLoaderError: function(handler) { __loaderErrorHandlers.push(handler); },

    // Action
    submitAction: function(data) {
      __actionPending = true;
      return rpc("submitAction", [data]).then(function(result) {
        __actionPending = false;
        return result;
      }).catch(function(err) {
        __actionPending = false;
        __actionErrorHandlers.forEach(function(h) { h(err); });
        throw err;
      });
    },
    get actionPending() { return __actionPending; },
    onActionError: function(handler) { __actionErrorHandlers.push(handler); },
    onActionComplete: function(handler) { __actionCompleteHandlers.push(handler); },

    // Reload — ask host to re-run loader
    reload: function() { postToHost({ type: "__reload" }); },

    // Loading control
    showLoading: function() {
      __loading = true;
      postToHost({ type: "__loading-show" });
    },
    hideLoading: function() {
      __loading = false;
      postToHost({ type: "__loading-hide" });
    },
    get loading() { return __loading; },

    // Dispose
    dispose: function() { postToHost({ type: "__dispose" }); }
  };

  // Expose the factory
  window.acquireEngineApi = function() {
    return Promise.resolve(engineApi);
  };
})();
</script>`;
}
