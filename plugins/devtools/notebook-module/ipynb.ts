// ── Notebook Module — IPYNB Parser/Serializer ────────────────
// Convert between .ipynb JSON and internal NotebookDocument format.

import type { NotebookDocument, NotebookCell, CellOutput } from "./types";

interface IPYNBCell {
  cell_type: "code" | "markdown" | "raw";
  source: string[];
  metadata?: Record<string, unknown>;
  outputs?: IPYNBOutput[];
  execution_count?: number | null;
}

interface IPYNBOutput {
  output_type: "stream" | "execute_result" | "display_data" | "error";
  text?: string[];
  data?: Record<string, string | string[]>;
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

interface IPYNBDocument {
  nbformat: number;
  nbformat_minor: number;
  metadata: Record<string, unknown>;
  cells: IPYNBCell[];
}

let idCounter = 0;

function parseOutput(raw: IPYNBOutput): CellOutput {
  if (raw.output_type === "error") {
    return {
      type: "error",
      data: `${raw.ename ?? "Error"}: ${raw.evalue ?? ""}\n${(raw.traceback ?? []).join("\n")}`,
    };
  }

  if (raw.output_type === "stream") {
    return {
      type: "text",
      data: (raw.text ?? []).join(""),
      mimeType: "text/plain",
    };
  }

  // execute_result or display_data
  const mimeData = raw.data ?? {};

  if (mimeData["text/html"]) {
    const html = Array.isArray(mimeData["text/html"])
      ? mimeData["text/html"].join("")
      : mimeData["text/html"];
    return { type: "html", data: html, mimeType: "text/html" };
  }

  if (mimeData["image/png"]) {
    const img = Array.isArray(mimeData["image/png"])
      ? mimeData["image/png"].join("")
      : mimeData["image/png"];
    return { type: "image", data: img, mimeType: "image/png" };
  }

  const text = mimeData["text/plain"];
  return {
    type: "text",
    data: Array.isArray(text) ? text.join("") : (text ?? ""),
    mimeType: "text/plain",
  };
}

export function parseIPYNB(json: string): NotebookDocument {
  const raw: IPYNBDocument = JSON.parse(json);
  const kernelLang =
    (raw.metadata?.kernelspec as Record<string, string> | undefined)?.language ?? "python";

  const cells: NotebookCell[] = raw.cells.map((rawCell) => {
    const type = rawCell.cell_type === "code" ? "code" : "markdown";
    return {
      id: `cell-${++idCounter}`,
      type,
      source: rawCell.source.join(""),
      outputs: (rawCell.outputs ?? []).map(parseOutput),
      executionCount: rawCell.execution_count ?? undefined,
      language: type === "code" ? kernelLang : "markdown",
    };
  });

  return {
    id: `nb-${Date.now()}`,
    cells,
    metadata: raw.metadata ?? {},
    dirty: false,
  };
}

export function serializeIPYNB(doc: NotebookDocument): string {
  const kernelLang =
    (doc.metadata?.kernelspec as Record<string, string> | undefined)?.language ?? "python";

  const cells: IPYNBCell[] = doc.cells.map((cell) => {
    const ipyCell: IPYNBCell = {
      cell_type: cell.type === "code" ? "code" : "markdown",
      source: cell.source.split("\n").map((line, i, arr) =>
        i < arr.length - 1 ? line + "\n" : line,
      ),
      metadata: {},
    };

    if (cell.type === "code") {
      ipyCell.execution_count = cell.executionCount ?? null;
      ipyCell.outputs = cell.outputs.map((out): IPYNBOutput => {
        if (out.type === "error") {
          const parts = out.data.split(": ", 2);
          return { output_type: "error", ename: parts[0], evalue: parts[1] ?? "" };
        }
        if (out.type === "text") {
          return { output_type: "stream", text: [out.data] };
        }
        // html, image
        const mime = out.mimeType ?? "text/plain";
        return { output_type: "display_data", data: { [mime]: [out.data] } };
      });
    }

    return ipyCell;
  });

  const ipynb: IPYNBDocument = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      ...doc.metadata,
      kernelspec: {
        display_name: kernelLang,
        language: kernelLang,
        name: kernelLang,
      },
    },
    cells,
  };

  return JSON.stringify(ipynb, null, 2);
}
