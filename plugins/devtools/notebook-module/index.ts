// ── Notebook Module — Plugin Entry ───────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type {
  NotebookCell,
  NotebookDocument,
  CellOutput,
  CellType,
  KernelConfig,
  NotebookModuleAPI,
} from "./types";
import { KernelClient } from "./kernel";
import { CellManager } from "./cell-manager";
import { parseIPYNB } from "./ipynb";

export type {
  NotebookCell,
  NotebookDocument,
  CellOutput,
  CellType,
  OutputType,
  KernelConfig,
  NotebookModuleAPI,
} from "./types";
export type { KernelStatus } from "./kernel";
export { KernelClient } from "./kernel";
export { CellManager } from "./cell-manager";
export { parseIPYNB, serializeIPYNB } from "./ipynb";
export { renderOutput, renderLatex } from "./output-renderer";

// ── Factory ──────────────────────────────────────────────────

export function createNotebookPlugin(config: KernelConfig = {}): {
  plugin: MonacoPlugin;
  api: NotebookModuleAPI;
} {
  const kernel = new KernelClient();
  const documents = new Map<string, { doc: NotebookDocument; mgr: CellManager }>();
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;
  let kernelConfig = { ...config };

  // ── API ──────────────────────────────────────────────────

  const api: NotebookModuleAPI = {
    openNotebook(json: string): NotebookDocument {
      const doc = parseIPYNB(json);
      const mgr = new CellManager();
      mgr.setCells(doc.cells);
      documents.set(doc.id, { doc, mgr });

      ctx?.emit("notebook:open", { docId: doc.id });
      return doc;
    },

    addCell(docId: string, type: CellType, source?: string, index?: number): NotebookCell {
      const entry = documents.get(docId);
      if (!entry) throw new Error(`Notebook ${docId} not found`);

      const lang = kernelConfig.language ?? "python";
      const cell = entry.mgr.add(type, source, lang, index);
      entry.doc.cells = entry.mgr.getCells();
      entry.doc.dirty = true;

      ctx?.emit("notebook:cell:add", { docId, cellId: cell.id });
      return cell;
    },

    removeCell(docId: string, cellId: string): void {
      const entry = documents.get(docId);
      if (!entry) return;

      entry.mgr.remove(cellId);
      entry.doc.cells = entry.mgr.getCells();
      entry.doc.dirty = true;

      ctx?.emit("notebook:cell:remove", { docId, cellId });
    },

    moveCell(docId: string, cellId: string, newIndex: number): void {
      const entry = documents.get(docId);
      if (!entry) return;

      entry.mgr.move(cellId, newIndex);
      entry.doc.cells = entry.mgr.getCells();
      entry.doc.dirty = true;
    },

    async executeCell(docId: string, cellId: string): Promise<CellOutput[]> {
      const entry = documents.get(docId);
      if (!entry) throw new Error(`Notebook ${docId} not found`);

      const cell = entry.mgr.getCell(cellId);
      if (!cell || cell.type !== "code") return [];

      ctx?.emit("notebook:cell:execute:start", { docId, cellId });

      try {
        // Ensure kernel is connected
        if (kernel.status === "disconnected") {
          await kernel.connect(kernelConfig);
        }

        const outputs = await kernel.execute(cell.source);
        entry.mgr.setOutputs(cellId, outputs);
        entry.doc.cells = entry.mgr.getCells();
        entry.doc.dirty = true;

        ctx?.emit("notebook:cell:execute:complete", { docId, cellId, outputs });
        return outputs;
      } catch (e) {
        const errorOutput: CellOutput = {
          type: "error",
          data: e instanceof Error ? e.message : String(e),
        };
        entry.mgr.setOutputs(cellId, [errorOutput]);
        entry.doc.cells = entry.mgr.getCells();

        ctx?.emit("notebook:cell:execute:error", { docId, cellId, error: errorOutput });
        return [errorOutput];
      }
    },

    async executeAll(docId: string): Promise<void> {
      const entry = documents.get(docId);
      if (!entry) return;

      for (const cell of entry.doc.cells) {
        if (cell.type === "code") {
          await api.executeCell(docId, cell.id);
        }
      }
    },

    getDocument(docId: string): NotebookDocument | undefined {
      return documents.get(docId)?.doc;
    },

    setKernel(newConfig: KernelConfig): void {
      kernelConfig = { ...kernelConfig, ...newConfig };
      kernel.disconnect();
      ctx?.emit("notebook:kernel:set", { config: kernelConfig });
    },

    interruptKernel(): void {
      kernel.interrupt();
      ctx?.emit("notebook:kernel:interrupt", {});
    },
  };

  // ── Plugin ─────────────────────────────────────────────────

  const plugin: MonacoPlugin = {
    id: "notebook-module",
    name: "Notebook",
    version: "1.0.0",
    description: "Jupyter-compatible notebook with kernel execution and IPYNB support",

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      disposables.push(
        ctx.on("notebook:cell:execute", (data?: unknown) => {
          const d = data as { docId: string; cellId: string } | undefined;
          if (d) api.executeCell(d.docId, d.cellId);
        }),
      );

      disposables.push(
        ctx.on("notebook:kernel:interrupt", () => {
          api.interruptKernel();
        }),
      );
    },

    onDispose() {
      kernel.disconnect();
      documents.clear();
      for (const d of disposables) d.dispose();
      disposables.length = 0;
      ctx = null;
    },
  };

  return { plugin, api };
}
