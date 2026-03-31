// ── Tab state manager — tracks open tabs, active tab, dirty state, ordering ──
import type { PluginContext } from "../../../core/types";
import type { TabEntry } from "./types";

export class TabState {
  private tabs = new Map<string, TabEntry>();
  private order: string[] = [];
  private activeUri: string | null = null;

  constructor(private ctx: PluginContext) {}

  /** Open a new tab or activate an existing one */
  open(uri: string, label?: string, icon?: string): TabEntry {
    let tab = this.tabs.get(uri);
    if (tab) {
      this.activate(uri);
      return tab;
    }

    tab = {
      uri,
      label: label ?? uri.split("/").pop() ?? uri,
      icon,
      dirty: false,
      pinned: false,
    };

    this.tabs.set(uri, tab);
    this.order.push(uri);
    this.activeUri = uri;

    this.ctx.emit("tab:open", { uri, label: tab.label });
    this.ctx.emit("tab:switch", { uri });
    return tab;
  }

  /** Close a tab */
  close(uri: string): void {
    if (!this.tabs.has(uri)) return;
    this.tabs.delete(uri);
    this.order = this.order.filter((u) => u !== uri);
    this.ctx.emit("tab:close", { uri });

    // Switch to the previous tab if this was active
    if (this.activeUri === uri) {
      this.activeUri = this.order.length > 0 ? this.order[this.order.length - 1] : null;
      if (this.activeUri) {
        this.ctx.emit("tab:switch", { uri: this.activeUri });
      }
    }
  }

  /** Activate (switch to) a tab */
  activate(uri: string): void {
    if (!this.tabs.has(uri) || this.activeUri === uri) return;
    this.activeUri = uri;
    this.ctx.emit("tab:switch", { uri });
  }

  /** Set dirty state for a tab */
  setDirty(uri: string, dirty: boolean): void {
    const tab = this.tabs.get(uri);
    if (!tab || tab.dirty === dirty) return;
    tab.dirty = dirty;
    this.ctx.emit("tab:dirty", { uri, dirty });
  }

  /** Pin/unpin a tab */
  pin(uri: string, pinned = true): void {
    const tab = this.tabs.get(uri);
    if (!tab || tab.pinned === pinned) return;
    tab.pinned = pinned;
    if (pinned) {
      // Move pinned tabs to the front
      this.order = this.order.filter((u) => u !== uri);
      const firstUnpinned = this.order.findIndex((u) => !this.tabs.get(u)?.pinned);
      this.order.splice(firstUnpinned === -1 ? this.order.length : firstUnpinned, 0, uri);
    }
    this.ctx.emit("tab:pin", { uri });
    this.ctx.emit("tab:reorder", { order: [...this.order] });
  }

  /** Reorder tabs */
  reorder(newOrder: string[]): void {
    this.order = newOrder.filter((u) => this.tabs.has(u));
    this.ctx.emit("tab:reorder", { order: [...this.order] });
  }

  getTab(uri: string): TabEntry | undefined {
    return this.tabs.get(uri);
  }

  getActiveUri(): string | null {
    return this.activeUri;
  }

  getAll(): TabEntry[] {
    return this.order.map((uri) => this.tabs.get(uri)!);
  }

  getOrder(): string[] {
    return [...this.order];
  }

  getDirtyUris(): string[] {
    return [...this.tabs.values()].filter((t) => t.dirty).map((t) => t.uri);
  }

  count(): number {
    return this.tabs.size;
  }

  clear(): void {
    this.tabs.clear();
    this.order = [];
    this.activeUri = null;
  }
}
