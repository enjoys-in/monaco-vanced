// ── Context Menu Registry ──────────────────────────────────
// Tracks registered menu items per context.

import type { MenuContext, MenuGroup, MenuItem } from "./types";

export class ContextMenuRegistry {
  private items = new Map<MenuContext, Map<string, MenuItem>>();
  private groups = new Map<MenuContext, Map<string, MenuGroup>>();

  // ── Items ───────────────────────────────────────────────

  registerItem(context: MenuContext, item: MenuItem): void {
    if (!this.items.has(context)) {
      this.items.set(context, new Map());
    }
    this.items.get(context)!.set(item.id, item);
  }

  unregisterItem(context: MenuContext, itemId: string): void {
    this.items.get(context)?.delete(itemId);
  }

  getItems(context: MenuContext): MenuItem[] {
    const contextItems = this.items.get(context);
    if (!contextItems) return [];
    return Array.from(contextItems.values()).sort(
      (a, b) => (a.order ?? 999) - (b.order ?? 999),
    );
  }

  // ── Groups ──────────────────────────────────────────────

  registerGroup(context: MenuContext, group: MenuGroup): void {
    if (!this.groups.has(context)) {
      this.groups.set(context, new Map());
    }
    this.groups.get(context)!.set(group.id, group);
  }

  getGroups(context: MenuContext): MenuGroup[] {
    const contextGroups = this.groups.get(context);
    if (!contextGroups) return [];
    return Array.from(contextGroups.values()).sort(
      (a, b) => (a.order ?? 999) - (b.order ?? 999),
    );
  }

  // ── Resolved ────────────────────────────────────────────

  getResolved(context: MenuContext): MenuItem[] {
    const ungrouped = this.getItems(context);
    const groups = this.getGroups(context);

    const result: MenuItem[] = [];

    // Add grouped items
    for (const group of groups) {
      if (result.length > 0) {
        result.push({ id: `sep-${group.id}`, label: "", type: "separator" });
      }
      for (const item of group.items) {
        result.push(item);
      }
    }

    // Add ungrouped items
    const groupedIds = new Set(
      groups.flatMap((g) => g.items.map((i) => i.id)),
    );
    const remaining = ungrouped.filter((i) => !groupedIds.has(i.id));
    if (remaining.length > 0 && result.length > 0) {
      result.push({ id: "sep-ungrouped", label: "", type: "separator" });
    }
    result.push(...remaining);

    return result;
  }

  dispose(): void {
    this.items.clear();
    this.groups.clear();
  }
}
