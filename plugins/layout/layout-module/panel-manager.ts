// ── Panel Manager ──────────────────────────────────────────
// Manages panel visibility, registered views, and sizing.

import type { PanelView, PanelViewLocation } from "./types";

export class PanelManager {
  private views = new Map<string, PanelView>();
  private activeViews: Record<PanelViewLocation, string | null> = {
    sidebar: null,
    right: null,
    bottom: null,
  };

  // ── Visibility ──────────────────────────────────────────

  private visibility: Record<PanelViewLocation, boolean> = {
    sidebar: true,
    right: false,
    bottom: false,
  };

  private sizes: Record<string, number> = {};

  constructor(
    defaults: {
      sidebarWidth: number;
      rightPanelWidth: number;
      bottomPanelHeight: number;
    },
  ) {
    this.sizes.sidebarWidth = defaults.sidebarWidth;
    this.sizes.rightPanelWidth = defaults.rightPanelWidth;
    this.sizes.bottomPanelHeight = defaults.bottomPanelHeight;
  }

  // ── View Registration ───────────────────────────────────

  registerView(view: PanelView): void {
    this.views.set(view.id, view);
    // Auto-activate first view per location
    if (!this.activeViews[view.location]) {
      this.activeViews[view.location] = view.id;
    }
  }

  unregisterView(viewId: string): void {
    const view = this.views.get(viewId);
    if (!view) return;
    this.views.delete(viewId);
    if (this.activeViews[view.location] === viewId) {
      const remaining = this.getViews(view.location);
      this.activeViews[view.location] = remaining[0]?.id ?? null;
    }
  }

  getViews(location: PanelViewLocation): PanelView[] {
    return Array.from(this.views.values())
      .filter((v) => v.location === location)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }

  getActiveView(location: PanelViewLocation): string | null {
    return this.activeViews[location];
  }

  setActiveView(location: PanelViewLocation, viewId: string): void {
    if (this.views.has(viewId)) {
      this.activeViews[location] = viewId;
    }
  }

  // ── Toggle / Resize ─────────────────────────────────────

  toggle(location: PanelViewLocation): boolean {
    this.visibility[location] = !this.visibility[location];
    return this.visibility[location];
  }

  setVisible(location: PanelViewLocation, visible: boolean): void {
    this.visibility[location] = visible;
  }

  isVisible(location: PanelViewLocation): boolean {
    return this.visibility[location];
  }

  resize(key: "sidebarWidth" | "rightPanelWidth" | "bottomPanelHeight", value: number): void {
    this.sizes[key] = Math.max(0, value);
  }

  getSize(key: "sidebarWidth" | "rightPanelWidth" | "bottomPanelHeight"): number {
    return this.sizes[key] ?? 0;
  }

  // ── Snapshot ────────────────────────────────────────────

  getVisibility(): Record<PanelViewLocation, boolean> {
    return { ...this.visibility };
  }

  getSizes(): Record<string, number> {
    return { ...this.sizes };
  }

  dispose(): void {
    this.views.clear();
  }
}
