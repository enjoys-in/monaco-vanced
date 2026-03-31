// ── Window Controls ────────────────────────────────────────
// Electron-style minimize/maximize/close controls.
// In browser mode these are no-ops.

export type WindowAction = "minimize" | "maximize" | "close";

export interface WindowControlsState {
  readonly isMaximized: boolean;
  readonly isElectron: boolean;
}

export class WindowControls {
  private isMaximized = false;
  private readonly isElectron: boolean;

  constructor() {
    // Detect Electron environment
    this.isElectron =
      typeof window !== "undefined" &&
      typeof (window as unknown as Record<string, unknown>).electronAPI !== "undefined";
  }

  getState(): WindowControlsState {
    return {
      isMaximized: this.isMaximized,
      isElectron: this.isElectron,
    };
  }

  execute(action: WindowAction): void {
    if (!this.isElectron) return;

    const electron = (window as unknown as Record<string, unknown>).electronAPI as
      | Record<string, () => void>
      | undefined;
    if (!electron) return;

    switch (action) {
      case "minimize":
        electron.minimize?.();
        break;
      case "maximize":
        if (this.isMaximized) {
          electron.unmaximize?.();
        } else {
          electron.maximize?.();
        }
        this.isMaximized = !this.isMaximized;
        break;
      case "close":
        electron.close?.();
        break;
    }
  }

  dispose(): void {
    // No resources to clean up
  }
}
