// ── Resource Module — DisposeGroupManager ─────────────────────

import type { DisposeGroup } from "./types";
import { ResourceRegistry } from "./registry";

export class DisposeGroupManager {
  private readonly groups = new Map<string, DisposeGroup>();
  private readonly registry: ResourceRegistry;

  constructor(registry: ResourceRegistry) {
    this.registry = registry;
  }

  createGroup(id: string): void {
    if (!this.groups.has(id)) {
      this.groups.set(id, { id, entries: [] });
    }
  }

  addToGroup(groupId: string, key: string): void {
    let group = this.groups.get(groupId);
    if (!group) {
      group = { id: groupId, entries: [] };
      this.groups.set(groupId, group);
    }
    if (!group.entries.includes(key)) {
      group.entries.push(key);
    }
  }

  disposeGroup(groupId: string): string[] {
    const group = this.groups.get(groupId);
    if (!group) return [];

    const disposed: string[] = [];
    for (const key of group.entries) {
      if (this.registry.dispose(key)) {
        disposed.push(key);
      }
    }

    this.groups.delete(groupId);
    return disposed;
  }

  getGroup(groupId: string): DisposeGroup | undefined {
    return this.groups.get(groupId);
  }

  getAll(): DisposeGroup[] {
    return Array.from(this.groups.values());
  }

  removeFromGroup(groupId: string, key: string): void {
    const group = this.groups.get(groupId);
    if (!group) return;
    const idx = group.entries.indexOf(key);
    if (idx !== -1) group.entries.splice(idx, 1);
  }
}
