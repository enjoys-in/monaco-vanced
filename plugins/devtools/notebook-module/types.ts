// ── Notebook Module — Shared Types ───────────────────────────

export type CellType = "code" | "markdown";
export type OutputType = "text" | "image" | "html" | "error";

export interface CellOutput {
  type: OutputType;
  data: string;
  mimeType?: string;
}

export interface NotebookCell {
  id: string;
  type: CellType;
  source: string;
  outputs: CellOutput[];
  executionCount?: number;
  language: string;
}

export interface NotebookDocument {
  id: string;
  cells: NotebookCell[];
  metadata: Record<string, unknown>;
  dirty: boolean;
}

export interface KernelConfig {
  baseUrl?: string;
  language?: string;
}

export interface NotebookModuleAPI {
  openNotebook(json: string): NotebookDocument;
  addCell(docId: string, type: CellType, source?: string, index?: number): NotebookCell;
  removeCell(docId: string, cellId: string): void;
  moveCell(docId: string, cellId: string, newIndex: number): void;
  executeCell(docId: string, cellId: string): Promise<CellOutput[]>;
  executeAll(docId: string): Promise<void>;
  getDocument(docId: string): NotebookDocument | undefined;
  setKernel(config: KernelConfig): void;
  interruptKernel(): void;
}
