// ── Menu Bar ───────────────────────────────────────────────
// Manages File/Edit/View/Help menu entries.

import type { MenuEntry } from "./types";

export class MenuBar {
  private menus: MenuEntry[] = [];

  setMenus(menus: MenuEntry[]): void {
    this.menus = menus;
  }

  getMenus(): MenuEntry[] {
    return this.menus;
  }

  getMenu(id: string): MenuEntry | undefined {
    return this.menus.find((m) => m.id === id);
  }

  addMenu(menu: MenuEntry): void {
    const idx = this.menus.findIndex((m) => m.id === menu.id);
    if (idx >= 0) {
      this.menus[idx] = menu;
    } else {
      this.menus.push(menu);
    }
  }

  removeMenu(id: string): void {
    this.menus = this.menus.filter((m) => m.id !== id);
  }

  dispose(): void {
    this.menus = [];
  }
}
