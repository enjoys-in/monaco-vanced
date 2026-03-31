// ── PDF preview provider ────────────────────────────────────
// pdf.js lazy-loaded on first PDF open. Page nav, zoom, search.
import type { PreviewProvider, PreviewFile } from "../types";

export const pdfProvider: PreviewProvider = {
  id: "pdf",
  extensions: [".pdf"],
  mimeTypes: ["application/pdf"],
  toolbarActions: [
    { id: "page-prev", icon: "arrow-up", tooltip: "Previous Page" },
    { id: "page-next", icon: "arrow-down", tooltip: "Next Page" },
    { id: "zoom-in", icon: "zoom-in", tooltip: "Zoom In" },
    { id: "zoom-out", icon: "zoom-out", tooltip: "Zoom Out" },
    { id: "search", icon: "search", tooltip: "Search" },
    { id: "thumbnails", icon: "thumbnails", tooltip: "Thumbnails", toggle: true },
  ],

  async render(file: PreviewFile): Promise<string> {
    const data = typeof file.content === "string" ? file.content : file.content as unknown as BlobPart;
    const blob = new Blob(
      [data],
      { type: "application/pdf" },
    );
    const url = file.objectUrl ?? URL.createObjectURL(blob);

    // Use browser's built-in PDF viewer via iframe (pdf.js lazy load is done
    // at the integration level for advanced features like search/thumbnails)
    return /* html */ `
      <div class="preview-pdf" style="height: 100%; width: 100%;">
        <iframe src="${url}" style="width: 100%; height: 100%; border: none;" title="PDF Preview: ${file.name}"></iframe>
      </div>
    `;
  },
};
