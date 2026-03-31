// ── Notification Module — Preferences (Dexie) ────────────────

import Dexie from "dexie";
import type { NotificationType } from "./types";
import type { CategoryPreference, GlobalPreference, NotificationHistoryEntry } from "./types";

// ── Dexie Database ───────────────────────────────────────────

class NotificationDB extends Dexie {
  history!: Dexie.Table<NotificationHistoryEntry, string>;
  categoryPrefs!: Dexie.Table<CategoryPreference, string>;
  globalPrefs!: Dexie.Table<GlobalPreference, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      history: "id, type, category, timestamp, read",
      categoryPrefs: "category",
      globalPrefs: "key",
    });
  }
}

// ── In-memory cache for fast reads ──────────────────────────

export class NotificationPreferences {
  private readonly db: NotificationDB;
  private readonly maxHistory: number;
  private categories = new Map<string, { muted: boolean; customDuration?: number }>();
  private typeDurations = new Map<NotificationType, number>();
  private globalMute = false;
  private _ready: Promise<void>;

  constructor(persistKey = "monaco-vanced-notifications", maxHistory = 200) {
    this.db = new NotificationDB(persistKey);
    this.maxHistory = maxHistory;
    this._ready = this.restore();
  }

  ready(): Promise<void> {
    return this._ready;
  }

  // ── Category prefs (in-memory + Dexie) ─────────────────

  mute(category: string): void {
    const existing = this.categories.get(category) ?? { muted: false };
    existing.muted = true;
    this.categories.set(category, existing);
    this.persistCategory(category);
  }

  unmute(category: string): void {
    const existing = this.categories.get(category);
    if (existing) {
      existing.muted = false;
      this.categories.set(category, existing);
      this.persistCategory(category);
    }
  }

  isMuted(category: string): boolean {
    if (this.globalMute) return true;
    return this.categories.get(category)?.muted ?? false;
  }

  setGlobalMute(muted: boolean): void {
    this.globalMute = muted;
    this.db.globalPrefs.put({ key: "globalMute", value: muted }).catch(() => {});
  }

  isGloballyMuted(): boolean {
    return this.globalMute;
  }

  setDurationForType(type: NotificationType, duration: number): void {
    this.typeDurations.set(type, duration);
    this.db.globalPrefs.put({ key: `typeDuration:${type}`, value: duration }).catch(() => {});
  }

  getDurationForType(type: NotificationType): number | undefined {
    return this.typeDurations.get(type);
  }

  setCategoryDuration(category: string, duration: number): void {
    const existing = this.categories.get(category) ?? { muted: false };
    existing.customDuration = duration;
    this.categories.set(category, existing);
    this.persistCategory(category);
  }

  getCategoryDuration(category: string): number | undefined {
    return this.categories.get(category)?.customDuration;
  }

  getMutedCategories(): string[] {
    const muted: string[] = [];
    for (const [cat, prefs] of this.categories) {
      if (prefs.muted) muted.push(cat);
    }
    return muted;
  }

  reset(): void {
    this.categories.clear();
    this.typeDurations.clear();
    this.globalMute = false;
    this.db.categoryPrefs.clear().catch(() => {});
    this.db.globalPrefs.clear().catch(() => {});
  }

  // ── History (Dexie only — heavy data) ─────────────────

  async addHistory(entry: NotificationHistoryEntry): Promise<void> {
    await this.db.history.put(entry);
    // Trim excess
    const count = await this.db.history.count();
    if (count > this.maxHistory) {
      const excess = await this.db.history
        .orderBy("timestamp")
        .limit(count - this.maxHistory)
        .primaryKeys();
      await this.db.history.bulkDelete(excess);
    }
  }

  async getHistory(): Promise<NotificationHistoryEntry[]> {
    return this.db.history.orderBy("timestamp").reverse().toArray();
  }

  async clearHistory(): Promise<void> {
    await this.db.history.clear();
  }

  async markRead(id: string): Promise<void> {
    await this.db.history.update(id, { read: true });
  }

  async markAllRead(): Promise<void> {
    await this.db.history.toCollection().modify({ read: true });
  }

  async getUnreadCount(): Promise<number> {
    return this.db.history.where("read").equals(0).count();
  }

  // ── Persistence helpers ────────────────────────────────

  private persistCategory(category: string): void {
    const prefs = this.categories.get(category);
    if (!prefs) return;
    this.db.categoryPrefs.put({ category, ...prefs }).catch(() => {});
  }

  private async restore(): Promise<void> {
    try {
      // Restore category prefs
      const cats = await this.db.categoryPrefs.toArray();
      for (const c of cats) {
        this.categories.set(c.category, { muted: c.muted, customDuration: c.customDuration });
      }
      // Restore global prefs
      const globals = await this.db.globalPrefs.toArray();
      for (const g of globals) {
        if (g.key === "globalMute") {
          this.globalMute = Boolean(g.value);
        } else if (g.key.startsWith("typeDuration:")) {
          const type = g.key.replace("typeDuration:", "") as NotificationType;
          this.typeDurations.set(type, g.value as number);
        }
      }
    } catch {
      // First run or DB error — start fresh
    }
  }
}
