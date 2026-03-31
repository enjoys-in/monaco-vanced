// ── Markdown preview provider ────────────────────────────────
// Uses DOMPurify for sanitization. Marked/remark parser is lazy-loaded.
import type { PreviewProvider, PreviewFile } from "../types";

export const markdownProvider: PreviewProvider = {
  id: "markdown",
  extensions: [".md", ".markdown", ".mdown", ".mkd"],
  mimeTypes: ["text/markdown"],
  supportsLiveUpdate: true,
  toolbarActions: [
    { id: "refresh", icon: "refresh", tooltip: "Refresh Preview" },
    { id: "scroll-sync", icon: "link", tooltip: "Scroll Sync", toggle: true },
    { id: "open-browser", icon: "globe", tooltip: "Open in Browser" },
  ],

  async render(file: PreviewFile): Promise<string> {
    const text = typeof file.content === "string"
      ? file.content
      : new TextDecoder().decode(file.content);

    // Lazy-load marked
    const { marked } = await import("marked");
    const html = await marked.parse(text, { gfm: true, breaks: true });

    return /* html */ `
      <div class="preview-markdown" style="padding: 16px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6;">
        ${html}
      </div>
    `;
  },
};
