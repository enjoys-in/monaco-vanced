// ── Notebook Module — Cell Manager ───────────────────────────
// Manages notebook cells: add, remove, move, update.

import type { NotebookCell, CellType, CellOutput } from "./types";

let cellCounter = 0;

export class CellManager {
  private cells: NotebookCell[] = [];
  private executionCounter = 0;

  setCells(cells: NotebookCell[]): void {
    this.cells = cells;
  }

  getCells(): NotebookCell[] {
    return [...this.cells];
  }

  add(type: CellType, source = "", language = "python", index?: number): NotebookCell {
    const cell: NotebookCell = {
      id: `cell-${++cellCounter}`,
      type,
      source,
      outputs: [],
      language: type === "markdown" ? "markdown" : language,
    };

    if (index !== undefined && index >= 0 && index <= this.cells.length) {
      this.cells.splice(index, 0, cell);
    } else {
      this.cells.push(cell);
    }

    return cell;
  }

  remove(cellId: string): boolean {
    const idx = this.cells.findIndex((c) => c.id === cellId);
    if (idx >= 0) {
      this.cells.splice(idx, 1);
      return true;
    }
    return false;
  }

  move(cellId: string, newIndex: number): boolean {
    const idx = this.cells.findIndex((c) => c.id === cellId);
    if (idx < 0 || newIndex < 0 || newIndex >= this.cells.length) return false;

    const [cell] = this.cells.splice(idx, 1);
    this.cells.splice(newIndex, 0, cell);
    return true;
  }

  update(cellId: string, source: string): boolean {
    const cell = this.cells.find((c) => c.id === cellId);
    if (!cell) return false;
    cell.source = source;
    return true;
  }

  getCell(cellId: string): NotebookCell | undefined {
    return this.cells.find((c) => c.id === cellId);
  }

  setOutputs(cellId: string, outputs: CellOutput[]): void {
    const cell = this.cells.find((c) => c.id === cellId);
    if (cell) {
      cell.outputs = outputs;
      cell.executionCount = ++this.executionCounter;
    }
  }

  clear(): void {
    this.cells = [];
    this.executionCounter = 0;
  }
}
