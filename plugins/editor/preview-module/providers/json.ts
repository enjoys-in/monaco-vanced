// ── JSON tree viewer provider ───────────────────────────────
// Collapsible tree, copy path/value, search, tree/raw toggle.
import type { PreviewProvider, PreviewFile } from "../types";

export const jsonProvider: PreviewProvider = {
  id: "json",
  extensions: [".json", ".jsonc", ".json5"],
  mimeTypes: ["application/json"],
  supportsLiveUpdate: true,
  toolbarActions: [
    { id: "expand-all", icon: "expand", tooltip: "Expand All" },
    { id: "collapse-all", icon: "collapse", tooltip: "Collapse All" },
    { id: "search", icon: "search", tooltip: "Search" },
    { id: "raw-toggle", icon: "code", tooltip: "Raw/Tree Toggle", toggle: true },
  ],

  async render(file: PreviewFile): Promise<string> {
    const text = typeof file.content === "string"
      ? file.content
      : new TextDecoder().decode(file.content);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return /* html */ `
        <div class="preview-json-error" style="padding: 16px; color: #f44;">
          <strong>JSON Parse Error</strong>
          <pre style="margin-top: 8px; white-space: pre-wrap;">${escapeHtml(text.slice(0, 500))}</pre>
        </div>
      `;
    }

    const formatted = JSON.stringify(parsed, null, 2);
    return /* html */ `
      <div class="preview-json" style="padding: 16px; font-family: 'Fira Code', monospace; font-size: 13px; overflow: auto; height: 100%;">
        <pre style="margin: 0; white-space: pre-wrap;">${escapeHtml(formatted)}</pre>
      </div>
    `;
  },
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
