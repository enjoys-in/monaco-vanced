export enum NotebookEvents {
  Open = "notebook:open",
  CellAdd = "notebook:cell:add",
  CellRemove = "notebook:cell:remove",
  CellExecuteStart = "notebook:cell:execute:start",
  CellExecuteComplete = "notebook:cell:execute:complete",
  CellExecuteError = "notebook:cell:execute:error",
  KernelSet = "notebook:kernel:set",
  KernelInterrupt = "notebook:kernel:interrupt",
}
