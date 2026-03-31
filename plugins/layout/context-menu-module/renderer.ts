// ── Context Menu Renderer ──────────────────────────────────
// Menu rendering logic: position calculation, overflow handling.

import type { ContextMenuState, MenuItem, MenuContext } from "./types";

export class ContextMenuRenderer {
  private state: ContextMenuState = {
    visible: false,
    x: 0,
    y: 0,
    context: "editor",
    items: [],
  };

  show(context: MenuContext, x: number, y: number, items: MenuItem[]): ContextMenuState {
    this.state = {
      visible: true,
      x: this.clampX(x),
      y: this.clampY(y),
      context,
      items,
    };
    return this.state;
  }

  dismiss(): ContextMenuState {
    this.state = { ...this.state, visible: false, items: [] };
    return this.state;
  }

  getState(): ContextMenuState {
    return this.state;
  }

  /**
   * Clamp X position to viewport bounds.
   * Menu width assumed ~220px — UI layer can override.
   */
  private clampX(x: number): number {
    if (typeof window === "undefined") return x;
    const menuWidth = 220;
    return Math.min(x, window.innerWidth - menuWidth);
  }

  /**
   * Clamp Y position to viewport bounds.
   * Menu height estimated — UI layer can override.
   */
  private clampY(y: number): number {
    if (typeof window === "undefined") return y;
    const menuHeight = 300;
    return Math.min(y, window.innerHeight - menuHeight);
  }

  dispose(): void {
    this.state = { visible: false, x: 0, y: 0, context: "editor", items: [] };
  }
}
