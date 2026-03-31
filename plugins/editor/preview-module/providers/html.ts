// ── HTML preview provider ───────────────────────────────────
// Sandboxed iframe with live preview on save.
import type { PreviewProvider, PreviewFile } from "../types";

export const htmlProvider: PreviewProvider = {
  id: "html",
  extensions: [".html", ".htm"],
  mimeTypes: ["text/html"],
  supportsLiveUpdate: true,
  toolbarActions: [
    { id: "refresh", icon: "refresh", tooltip: "Refresh" },
    { id: "device", icon: "device", tooltip: "Device Viewport" },
    { id: "console", icon: "terminal", tooltip: "Console", toggle: true },
  ],

  async render(file: PreviewFile): Promise<string> {
    const text = typeof file.content === "string"
      ? file.content
      : new TextDecoder().decode(file.content);

    // Encode as data URI for sandboxed iframe
    const encoded = btoa(unescape(encodeURIComponent(text)));
    const dataUri = `data:text/html;base64,${encoded}`;

    return /* html */ `
      <div class="preview-html" style="height: 100%; width: 100%;">
        <iframe
          src="${dataUri}"
          sandbox="allow-scripts allow-same-origin"
          style="width: 100%; height: 100%; border: none;"
          title="HTML Preview: ${file.name}"
        ></iframe>
      </div>
    `;
  },
};
