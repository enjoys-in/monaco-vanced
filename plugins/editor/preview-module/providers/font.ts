// ── Font preview provider ───────────────────────────────────
// @font-face dynamic load, sample text, size variations, glyph grid.
import type { PreviewProvider, PreviewFile } from "../types";

export const fontProvider: PreviewProvider = {
  id: "font",
  extensions: [".ttf", ".otf", ".woff", ".woff2"],
  mimeTypes: ["font/ttf", "font/otf", "font/woff", "font/woff2"],
  toolbarActions: [
    { id: "edit-sample", icon: "edit", tooltip: "Edit Sample Text" },
    { id: "glyph-map", icon: "grid", tooltip: "Glyph Map", toggle: true },
  ],

  async render(file: PreviewFile): Promise<string> {
    const data = typeof file.content === "string" ? file.content : file.content as unknown as BlobPart;
    const blob = new Blob([data]);
    const url = file.objectUrl ?? URL.createObjectURL(blob);
    const fontName = `preview-font-${file.name.replace(/[^a-zA-Z0-9]/g, "-")}`;

    const sizes = [12, 16, 20, 24, 32, 48, 72];
    const sampleText = "The quick brown fox jumps over the lazy dog";
    const sampleRows = sizes
      .map(
        (s) =>
          `<div style="font-size: ${s}px; font-family: '${fontName}', sans-serif; margin: 8px 0;">
            <span style="color: #888; font-family: monospace; font-size: 12px; width: 40px; display: inline-block;">${s}px</span>
            ${sampleText}
          </div>`,
      )
      .join("");

    return /* html */ `
      <style>
        @font-face {
          font-family: '${fontName}';
          src: url('${url}');
        }
      </style>
      <div class="preview-font" style="padding: 24px; font-family: -apple-system, sans-serif;">
        <h3 style="margin: 0 0 16px 0;">${file.name}</h3>
        ${sampleRows}
      </div>
    `;
  },
};
