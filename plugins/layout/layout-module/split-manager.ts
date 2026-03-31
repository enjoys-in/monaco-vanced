// ── Split Manager ──────────────────────────────────────────
// Manages horizontal/vertical splits and editor groups.

import type { EditorGroup, SplitDirection, SplitNode } from "./types";

let nextSplitId = 1;
let nextGroupId = 1;

export class SplitManager {
  private splits = new Map<string, SplitNode>();
  private groups = new Map<string, EditorGroup>();
  private activeGroupId: string | null = null;

  constructor() {
    // Create default editor group
    const defaultGroup = this.createGroup();
    this.activeGroupId = defaultGroup.id;
  }

  // ── Splits ──────────────────────────────────────────────

  split(direction: SplitDirection, ratio = 0.5): SplitNode {
    const activeId = this.activeGroupId;
    if (!activeId) throw new Error("No active editor group to split");

    const newGroup = this.createGroup();
    const splitId = `split-${nextSplitId++}`;
    const node: SplitNode = {
      id: splitId,
      direction,
      ratio: Math.max(0.1, Math.min(0.9, ratio)),
      children: [activeId, newGroup.id],
    };
    this.splits.set(splitId, node);
    return node;
  }

  unsplit(splitId: string): void {
    const node = this.splits.get(splitId);
    if (!node) return;
    // Remove the second child group
    const [keepId, removeId] = node.children;
    this.groups.delete(removeId);
    this.splits.delete(splitId);
    if (this.activeGroupId === removeId) {
      this.activeGroupId = keepId;
    }
  }

  setSplitRatio(splitId: string, ratio: number): void {
    const node = this.splits.get(splitId);
    if (!node) return;
    (node as { ratio: number }).ratio = Math.max(0.1, Math.min(0.9, ratio));
  }

  getSplits(): SplitNode[] {
    return Array.from(this.splits.values());
  }

  // ── Editor Groups ───────────────────────────────────────

  private createGroup(): EditorGroup {
    const id = `group-${nextGroupId++}`;
    const group: EditorGroup = { id, activeUri: null, uris: [] };
    this.groups.set(id, group);
    return group;
  }

  addGroup(): EditorGroup {
    return this.createGroup();
  }

  removeGroup(groupId: string): void {
    if (this.groups.size <= 1) return; // Keep at least one group
    this.groups.delete(groupId);
    // Remove any splits referencing this group
    for (const [splitId, node] of this.splits) {
      if (node.children.includes(groupId)) {
        this.splits.delete(splitId);
      }
    }
    if (this.activeGroupId === groupId) {
      this.activeGroupId = this.groups.keys().next().value ?? null;
    }
  }

  getGroups(): EditorGroup[] {
    return Array.from(this.groups.values());
  }

  getActiveGroupId(): string | null {
    return this.activeGroupId;
  }

  setActiveGroup(groupId: string): void {
    if (this.groups.has(groupId)) {
      this.activeGroupId = groupId;
    }
  }

  dispose(): void {
    this.splits.clear();
    this.groups.clear();
    this.activeGroupId = null;
  }
}
