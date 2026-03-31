// ── SVG preview provider ────────────────────────────────────
// Inline SVG rendering with zoom/pan and source toggle.
import type { PreviewProvider, PreviewFile } from "../types";

export const svgProvider: PreviewProvider = {
  id: "svg",
  extensions: [".svg"],
  mimeTypes: ["image/svg+xml"],
  supportsLiveUpdate: true,
  toolbarActions: [
    { id: "zoom-in", icon: "zoom-in", tooltip: "Zoom In" },
    { id: "zoom-out", icon: "zoom-out", tooltip: "Zoom Out" },
    { id: "fit", icon: "fit", tooltip: "Fit to Window" },
    { id: "background", icon: "grid", tooltip: "Toggle Background", toggle: true },
    { id: "source-toggle", icon: "code", tooltip: "View Source", toggle: true },
  ],

  async render(file: PreviewFile): Promise<string> {
    const text = typeof file.content === "string"
      ? file.content
      : new TextDecoder().decode(file.content);

    // Create object URL for safe rendering
    const blob = new Blob([text], { type: "image/svg+xml" });
    const url = file.objectUrl ?? URL.createObjectURL(blob);

    return /* html */ `
      <div class="preview-svg" style="display: flex; align-items: center; justify-content: center; height: 100%; background: repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 50%/16px 16px;">
        <img src="${url}" alt="${file.name}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
      </div>
    `;
  },
};
