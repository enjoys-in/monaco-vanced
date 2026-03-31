// ── Statusbar Slot Registry ────────────────────────────────
// Left/right slot registration and ordering.

import type { StatusbarAlignment, StatusbarItem } from "./types";

export class SlotRegistry {
  private items = new Map<string, StatusbarItem>();

  register(item: StatusbarItem): void {
    this.items.set(item.id, { visible: true, ...item });
  }

  update(id: string, changes: Partial<Omit<StatusbarItem, "id">>): void {
    const existing = this.items.get(id);
    if (!existing) return;
    this.items.set(id, { ...existing, ...changes });
  }

  remove(id: string): void {
    this.items.delete(id);
  }

  get(id: string): StatusbarItem | undefined {
    return this.items.get(id);
  }

  getAll(alignment?: StatusbarAlignment): StatusbarItem[] {
    let items = Array.from(this.items.values()).filter((i) => i.visible !== false);
    if (alignment) {
      items = items.filter((i) => i.alignment === alignment);
    }
    return items.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  setVisible(id: string, visible: boolean): void {
    this.update(id, { visible });
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  dispose(): void {
    this.items.clear();
  }
}
