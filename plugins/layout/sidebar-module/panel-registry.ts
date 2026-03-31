// ── Sidebar Panel Registry ─────────────────────────────────
// Tracks registered sidebar view panels.

import type { SidebarViewConfig } from "./types";

export class SidebarPanelRegistry {
  private views = new Map<string, SidebarViewConfig>();
  private activeViewId: string | null = null;

  register(view: SidebarViewConfig): void {
    this.views.set(view.id, view);
    // Auto-activate first registered view
    if (!this.activeViewId) {
      this.activeViewId = view.id;
    }
  }

  unregister(viewId: string): void {
    this.views.delete(viewId);
    if (this.activeViewId === viewId) {
      const first = this.getAll()[0];
      this.activeViewId = first?.id ?? null;
    }
  }

  activate(viewId: string): void {
    if (this.views.has(viewId)) {
      this.activeViewId = viewId;
    }
  }

  getActive(): string | null {
    return this.activeViewId;
  }

  get(viewId: string): SidebarViewConfig | undefined {
    return this.views.get(viewId);
  }

  getAll(): SidebarViewConfig[] {
    return Array.from(this.views.values()).sort(
      (a, b) => (a.order ?? 999) - (b.order ?? 999),
    );
  }

  has(viewId: string): boolean {
    return this.views.has(viewId);
  }

  dispose(): void {
    this.views.clear();
    this.activeViewId = null;
  }
}
