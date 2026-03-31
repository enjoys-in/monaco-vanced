// ── Tooltip Component Logic ────────────────────────────────
// Tooltip positioning and delay management.

import type { TooltipConfig } from "../types";

export interface TooltipState {
  readonly visible: boolean;
  readonly content: string;
  readonly x: number;
  readonly y: number;
}

export class TooltipManager {
  private state: TooltipState = { visible: false, content: "", x: 0, y: 0 };
  private showTimeout: ReturnType<typeof setTimeout> | null = null;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  show(
    config: TooltipConfig,
    anchorRect: { x: number; y: number; width: number; height: number },
  ): TooltipState {
    this.clearTimeouts();
    const delay = config.delay ?? 500;

    if (delay > 0) {
      this.showTimeout = setTimeout(() => {
        this.state = {
          visible: true,
          content: config.content,
          ...this.calculatePosition(config.position ?? "top", anchorRect),
        };
      }, delay);
      return this.state;
    }

    this.state = {
      visible: true,
      content: config.content,
      ...this.calculatePosition(config.position ?? "top", anchorRect),
    };
    return this.state;
  }

  hide(delay = 100): void {
    this.clearTimeouts();
    this.hideTimeout = setTimeout(() => {
      this.state = { ...this.state, visible: false };
    }, delay);
  }

  hideImmediate(): void {
    this.clearTimeouts();
    this.state = { ...this.state, visible: false };
  }

  getState(): TooltipState {
    return this.state;
  }

  private calculatePosition(
    position: "top" | "bottom" | "left" | "right",
    anchor: { x: number; y: number; width: number; height: number },
  ): { x: number; y: number } {
    const gap = 8;
    switch (position) {
      case "top":
        return { x: anchor.x + anchor.width / 2, y: anchor.y - gap };
      case "bottom":
        return { x: anchor.x + anchor.width / 2, y: anchor.y + anchor.height + gap };
      case "left":
        return { x: anchor.x - gap, y: anchor.y + anchor.height / 2 };
      case "right":
        return { x: anchor.x + anchor.width + gap, y: anchor.y + anchor.height / 2 };
    }
  }

  private clearTimeouts(): void {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  dispose(): void {
    this.clearTimeouts();
    this.state = { visible: false, content: "", x: 0, y: 0 };
  }
}
