// ── Modal Component Logic ──────────────────────────────────
// Headless modal state management.

import type { ModalAction, ModalConfig } from "../types";

export class ModalState {
  private visible = false;
  private config: ModalConfig | null = null;

  open(config: ModalConfig): void {
    this.config = config;
    this.visible = true;
  }

  close(): void {
    this.visible = false;
    this.config = null;
  }

  isVisible(): boolean {
    return this.visible;
  }

  getConfig(): ModalConfig | null {
    return this.config;
  }

  getActions(): ModalAction[] {
    return this.config?.actions ?? [];
  }

  getPrimaryAction(): ModalAction | undefined {
    return this.config?.actions?.find((a) => a.primary);
  }

  handleAction(actionId: string): ModalAction | undefined {
    const action = this.config?.actions?.find((a) => a.id === actionId);
    if (action && !action.disabled) {
      return action;
    }
    return undefined;
  }
}

/**
 * Create a confirmation modal config.
 */
export function createConfirmModal(
  title: string,
  content: string,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
): ModalConfig {
  return {
    id: `confirm-${Date.now()}`,
    title,
    content,
    closable: true,
    overlay: true,
    actions: [
      { id: "cancel", label: cancelLabel },
      { id: "confirm", label: confirmLabel, primary: true },
    ],
  };
}

/**
 * Create a danger confirmation modal config.
 */
export function createDangerModal(
  title: string,
  content: string,
  confirmLabel = "Delete",
): ModalConfig {
  return {
    id: `danger-${Date.now()}`,
    title,
    content,
    closable: true,
    overlay: true,
    actions: [
      { id: "cancel", label: "Cancel" },
      { id: "confirm", label: confirmLabel, primary: true, danger: true },
    ],
  };
}
