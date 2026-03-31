// ── Debugger Module — Call Stack ──────────────────────────────

import type { StackFrame } from "./types";

export class CallStack {
  private frames: StackFrame[] = [];
  private currentIndex = 0;

  setFrames(frames: StackFrame[]): void {
    this.frames = frames;
    this.currentIndex = frames.length > 0 ? 0 : -1;
  }

  getFrames(): StackFrame[] {
    return [...this.frames];
  }

  getCurrentFrame(): StackFrame | undefined {
    if (this.currentIndex < 0 || this.currentIndex >= this.frames.length) {
      return undefined;
    }
    return this.frames[this.currentIndex];
  }

  navigateTo(frameId: number): StackFrame | undefined {
    const idx = this.frames.findIndex((f) => f.id === frameId);
    if (idx >= 0) {
      this.currentIndex = idx;
      return this.frames[idx];
    }
    return undefined;
  }

  clear(): void {
    this.frames = [];
    this.currentIndex = -1;
  }

  get depth(): number {
    return this.frames.length;
  }
}
