// ── Profiler Module — Flame Graph Builder ────────────────────
// Builds a flame graph tree from sampled call stacks.

import type { FlameNode } from "./types";

let nodeCounter = 0;

function makeNode(name: string, file = "", line = 0): FlameNode {
  return {
    id: `flame-${++nodeCounter}`,
    name,
    file,
    line,
    selfTime: 0,
    totalTime: 0,
    children: [],
  };
}

export class FlameGraphBuilder {
  private root: FlameNode = makeNode("(root)");
  private sampleCount = 0;

  /**
   * Add a profiling sample.
   * @param stack Array of frame names (deepest last), e.g. ["main", "process", "compute"]
   * @param duration Duration of this sample in ms
   */
  addSample(stack: string[], duration: number): void {
    if (stack.length === 0) return;
    this.sampleCount++;

    let current = this.root;
    current.totalTime += duration;

    for (let i = 0; i < stack.length; i++) {
      const frameName = stack[i];
      // Parse "functionName (file:line)" format
      const parsed = this.parseFrame(frameName);

      let child = current.children.find((c) => c.name === parsed.name && c.file === parsed.file);
      if (!child) {
        child = makeNode(parsed.name, parsed.file, parsed.line);
        current.children.push(child);
      }

      child.totalTime += duration;

      // Last frame in the stack gets selfTime
      if (i === stack.length - 1) {
        child.selfTime += duration;
      }

      current = child;
    }
  }

  /** Build the final flame graph tree */
  build(): FlameNode {
    return this.root;
  }

  /** Reset the builder */
  reset(): void {
    nodeCounter = 0;
    this.root = makeNode("(root)");
    this.sampleCount = 0;
  }

  get samples(): number {
    return this.sampleCount;
  }

  private parseFrame(frame: string): { name: string; file: string; line: number } {
    // Match "functionName (file.ts:42)"
    const match = frame.match(/^(.+?)\s+\((.+?):(\d+)\)$/);
    if (match) {
      return { name: match[1], file: match[2], line: parseInt(match[3], 10) };
    }
    return { name: frame, file: "", line: 0 };
  }
}
