// ── Image preview provider ──────────────────────────────────
// Zoom/pan, fit/actual toggle, checkerboard transparency background.
import type { PreviewProvider, PreviewFile } from "../types";

export const imageProvider: PreviewProvider = {
  id: "image",
  extensions: [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico", ".bmp", ".avif"],
  mimeTypes: ["image/png", "image/jpeg", "image/gif", "image/svg+xml", "image/webp"],
  toolbarActions: [
    { id: "zoom-in", icon: "zoom-in", tooltip: "Zoom In" },
    { id: "zoom-out", icon: "zoom-out", tooltip: "Zoom Out" },
    { id: "fit", icon: "fit", tooltip: "Fit to Window" },
    { id: "actual-size", icon: "actual", tooltip: "Actual Size" },
    { id: "background", icon: "grid", tooltip: "Toggle Background", toggle: true },
  ],

  async render(file: PreviewFile): Promise<string> {
    const data = typeof file.content === "string" ? file.content : file.content as unknown as BlobPart;
    const src = file.objectUrl ?? URL.createObjectURL(
      new Blob([data]),
    );

    return /* html */ `
      <div class="preview-image" style="display: flex; align-items: center; justify-content: center; height: 100%; background: repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 50%/16px 16px;">
        <img src="${src}" alt="${file.name}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
      </div>
    `;
  },
};
