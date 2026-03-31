// ── CSV table viewer provider ───────────────────────────────
// Auto-detect delimiter, column sort, virtual scrolling table.
import type { PreviewProvider, PreviewFile } from "../types";

export const csvProvider: PreviewProvider = {
  id: "csv",
  extensions: [".csv", ".tsv"],
  mimeTypes: ["text/csv", "text/tab-separated-values"],
  toolbarActions: [
    { id: "sort", icon: "sort", tooltip: "Sort" },
    { id: "delimiter", icon: "settings", tooltip: "Delimiter" },
    { id: "row-count", icon: "hash", tooltip: "Row Count" },
  ],

  async render(file: PreviewFile): Promise<string> {
    const text = typeof file.content === "string"
      ? file.content
      : new TextDecoder().decode(file.content);

    const delimiter = detectDelimiter(text);
    const rows = parseCSV(text, delimiter);
    if (rows.length === 0) {
      return `<div style="padding: 16px; color: #888;">Empty file</div>`;
    }

    const headers = rows[0];
    const body = rows.slice(1);

    const thCells = headers
      .map((h) => `<th style="padding: 6px 12px; border-bottom: 2px solid #ddd; text-align: left; white-space: nowrap;">${escapeHtml(h)}</th>`)
      .join("");

    const bodyRows = body
      .slice(0, 1000) // limit render to 1000 rows for performance
      .map(
        (row) =>
          `<tr>${row.map((cell) => `<td style="padding: 4px 12px; border-bottom: 1px solid #eee; white-space: nowrap;">${escapeHtml(cell)}</td>`).join("")}</tr>`,
      )
      .join("");

    const truncated = body.length > 1000 ? `<div style="padding: 8px 12px; color: #888;">Showing 1,000 of ${body.length.toLocaleString()} rows</div>` : "";

    return /* html */ `
      <div class="preview-csv" style="overflow: auto; height: 100%; font-family: monospace; font-size: 13px;">
        <table style="border-collapse: collapse; width: 100%;">
          <thead><tr>${thCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
        ${truncated}
      </div>
    `;
  },
};

function detectDelimiter(text: string): string {
  const firstLine = text.split("\n")[0] ?? "";
  const commas = (firstLine.match(/,/g) ?? []).length;
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  if (tabs >= commas && tabs >= semicolons) return "\t";
  if (semicolons > commas) return ";";
  return ",";
}

function parseCSV(text: string, delimiter: string): string[][] {
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, "")));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
