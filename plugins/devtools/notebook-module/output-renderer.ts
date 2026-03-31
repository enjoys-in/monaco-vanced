// ── Notebook Module — Output Renderer ────────────────────────
// Converts CellOutput to renderable HTML strings.

import type { CellOutput } from "./types";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderOutput(output: CellOutput): { html: string } {
  switch (output.type) {
    case "text":
      return {
        html: `<pre class="nb-output-text">${escapeHtml(output.data)}</pre>`,
      };

    case "html":
      // Sanitize: strip script tags for safety
      return {
        html: `<div class="nb-output-html">${output.data.replace(/<script[\s\S]*?<\/script>/gi, "")}</div>`,
      };

    case "image": {
      const mime = output.mimeType ?? "image/png";
      return {
        html: `<div class="nb-output-image"><img src="data:${escapeHtml(mime)};base64,${escapeHtml(output.data)}" alt="output" /></div>`,
      };
    }

    case "error":
      return {
        html: `<pre class="nb-output-error">${escapeHtml(output.data)}</pre>`,
      };

    default:
      return {
        html: `<pre class="nb-output-unknown">${escapeHtml(output.data)}</pre>`,
      };
  }
}

/** Render a LaTeX string (wraps in KaTeX-compatible container) */
export function renderLatex(latex: string): { html: string } {
  return {
    html: `<div class="nb-output-latex" data-latex="${escapeHtml(latex)}">${escapeHtml(latex)}</div>`,
  };
}
